import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateWriteOpResult } from 'mongoose';
import { JwtAndSubscription } from 'src/modules/subscriptions/interfaces/jwt-with-subscription.interface';
import { CreatePodDto } from './dto/create-pod.dto';
import { InvitationStatus, Member, MemberPod } from './interfaces/member.interface';
import { SavingPod, SavingPodDocument } from './schemas/saving-pods.schema';
import { SavingPod as ISavingPod } from './interfaces/create-pod-response.interface';
import { UpdateSavingPodDto } from './dto/update-pod.dto';
import { SubscriptionOptions } from 'src/modules/subscriptions/interfaces/user-subscription.interface';
import { NotFoundException } from '@nestjs/common';
import { SavingPodInvitation } from './schemas/saving-pod-invitation.schema';
import * as crypto from "crypto";
import { MailerService } from 'src/modules/mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { SharedService } from 'src/modules/shared/shared.service';
import { InvitationUser } from './interfaces/invitation-user.interface';
import { GenericResponse } from 'src/modules/shared/interfaces/common.interface';
import { SavingPodForPayout, SavingPodToCharge, SavingPodToTranfer } from './interfaces/get-saving-pod.interface';

@Injectable()
export class SavingPodsService {
    
    constructor(
        @InjectModel(SavingPod.name)
        private readonly savingPodModel: Model<SavingPod>,
        @InjectModel(SavingPodInvitation.name)
        private readonly savingPodInviteModel: Model<SavingPodInvitation>,
        private readonly mailerSrvc: MailerService,
        private readonly configSrvc: ConfigService,
        private readonly sharedSrvc: SharedService
    ) {}

    async createPod(request: JwtAndSubscription, dto: CreatePodDto): Promise<ISavingPod> {
        const userId = request.user.id;
        const subcriptionOptions: SubscriptionOptions = request.subscription.options;

        this.validatePodAmount(+dto.amount, subcriptionOptions);
        await this.validatePodMax(userId, subcriptionOptions);

        const payload = {
            user: userId,
            amount: dto.amount
        };

        const hasMembers = dto.members && Array.isArray(dto.members) && dto.members.length;
        this.validatePodMembers(hasMembers ? dto.members : [], subcriptionOptions);

        if (hasMembers) {
            const payByChoice = subcriptionOptions['pod-pay-by-choice'];

            payload['members'] = dto.members.map((member: Member) => {

                const data = {
                    user: member.user,
                    invitationStatus: member.user !== request.user.id ? InvitationStatus.PENDING : InvitationStatus.ACCEPTED,
                    order: 0
                };

                // when subscription has pay by choice feature than user can pass order
                data.order = payByChoice ? member.order : 0;

                return data;
            });
        }

        const savingPodResponse = await this.savingPodModel.create(payload);
        // await this.sendNotificationToPodMembers(savingPodResponse._id.toHexString());

        return await this.getPod(savingPodResponse._id.toHexString());
    }

    /**
     * 
     * @param userId 
     * 
     * Returns all non expired user saving pods as he can only keep allowed pods active
     * which are non expired.
     * 
     * @returns {SavingPodDocument[]}
     */
    async getUserPods(userId: string): Promise<SavingPodDocument[]> {
        return await this.savingPodModel.find({ user: userId, expired: false });
    }

    async getPodInstance(podId: string): Promise<SavingPodDocument> {
        return await this.savingPodModel.findById(podId).exec();
    }

    async getPodWithUserEmailPhone(podId: string) {
        return await this.savingPodModel
        .findById(podId)
        .populate({
                path: "members.user",
                select: "firstName lastName email mobile"
        }).exec();
    }

    async getPod(podId: string): Promise<ISavingPod> {
        const savingPod = await this.savingPodModel
        .findById(podId)
        .populate([
            {
                path: "user",
                select: "firstName lastName",
            },
            {
                path: "members.user",
                select: "firstName lastName"
            }
        ])
        .lean();
                        
        return {
            id: savingPod._id.toHexString(),
            user: savingPod.user['_id'],
            name: `${savingPod.user['firstName']} ${savingPod.user['lastName']}`,
            amount: savingPod.amount,
            members: savingPod.members.map((member) => {
                return {
                    user: member.user['_id'],
                    name: `${member.user['firstName']} ${member.user['lastName']}`,
                    invitationStatus: member.invitationStatus,
                    addedAt: member.addedAt
                }
            }) as Member[]
        }
    }

    async getUserActivePods(request: JwtAndSubscription): Promise<SavingPodDocument[]> {
        return await this.savingPodModel
        .find({ user: request.user.id, expired: false })
        .populate([
            {
                path: "user",
                select: "firstName lastName",
            },
            {
                path: "members.user",
                select: "firstName lastName"
            }
        ])
        .select('user amount startDate members');
    }

    /**
     * 
     * @param request {JwtAndSubscription}
     * 
     * User will be searched in pods members data and 
     * if user is a member in any of the pods and it is active then pod will be picked
     * 
     * @returns {MemberPod[]}
     * 
     */
    async getMemberPods(request: JwtAndSubscription): Promise<MemberPod[]> {
        const savindPods = await this.savingPodModel.find({
            expired: false,
            members: {
                $elemMatch: {
                    user: request.user.id,
                    invitationStatus: {
                        $ne: InvitationStatus.DECLINED
                    }
                }
            }
        })
        .populate([
            {
                path: "members.user",
                select: "firstName lastName -_id"
            }
        ])
        .select('amount startDate members -_id')
        .lean();
        
        return savindPods.map(pod => ({
            ...pod,
            members: pod.members.map(({ addedAt, ...rest }) => ({
                ...rest
            }))
        })) as unknown as MemberPod[];
    }


    /**
     * 
     * @param request {JwtAndSubscription}
     * @param podId {string}
     * @param dto {UpdateSavingPodDto}
     * 
     * User can update amount, startDate, members and expired entities using this function
     * 
     * @returns 
     */
    async updatePod(request: JwtAndSubscription, podId: string, dto: UpdateSavingPodDto): Promise<GenericResponse> {
        const savingPod = await this.getPodInstance(podId);
        if (!savingPod) {
            throw new NotFoundException();
        }

        const subcriptionOptions = request.subscription.options;
        const payByChoice = subcriptionOptions['pod-pay-by-choice'];

        if (dto.amount) {
            this.validatePodAmount(+dto.amount, subcriptionOptions);
        }

        const hasMembers = dto.members && Array.isArray(dto.members) && dto.members.length;
        this.validatePodMembers(hasMembers ? dto.members : [], subcriptionOptions);

        const memberInviteStatus: { [key: string]: string } = savingPod.members.reduce((obj: any, member: Member) => {
            obj[member.user as any] = member.invitationStatus;
            return obj;
        }, {});
        
        const updatedDto = {
            ...dto,
            members: dto.members.map((member: Member) => {
                const availabeInvitationStatus = memberInviteStatus[member.user as unknown as string];

                const data = {
                    user: member.user,
                    invitationStatus: member.user !== request.user.id ? availabeInvitationStatus ? availabeInvitationStatus : InvitationStatus.PENDING : InvitationStatus.ACCEPTED,
                    order: 0
                };

                // when subscription has pay by choice feature than user can pass order
                if (payByChoice) {
                    data.order = member.order;
                }

                return data;
            })
        }

        await this.savingPodModel.findOneAndUpdate({ _id: podId }, updatedDto);
        // await this.sendNotificationToPodMembers(podId);

        return {
            success: true
        };
    }

    /**
     * 
     * @param podId {string}
     * @param memberUserId {string}
     * 
     * Add a chargedAt for all members
     * and Add a transferAt for given member
     * 
     * @returns {Promise<UpdateWriteOpResult>}
     */
    async updatePodMemberDate(podId: string, memberUserId: string): Promise<UpdateWriteOpResult[]> {
        const today = new Date();

        const after7Days = new Date();
        after7Days.setDate(today.getDate() + 7);

        const addTransferAtResponse = await this.savingPodModel.updateOne({
            _id: podId,
            "members.user": memberUserId
        }, {
            $set: {
                "members.$.transferAt": after7Days
            }
        });

        const addChargedAtResponse = await this.savingPodModel.updateOne({
            _id: podId,
        }, {
            $set: {
                "members.$[].chargedAt": today
            }
        });

        return [addTransferAtResponse, addChargedAtResponse]
    }

    /**
     * 
     * @param podId {string}
     * @param memberUserId {string}
     * 
     * Set dates for a transferedAt and payAt for given member
     * 
     * @returns {Promise<UpdateWriteOpResult>}
     */
    async updatePodMemberOfTransfer(podId: string, memberUserId: string): Promise<UpdateWriteOpResult> {
        const today = new Date();

        const after7Days = new Date();
        after7Days.setDate(today.getDate() + 7);

        return await this.savingPodModel.updateOne({
            _id: podId,
            "members.user": memberUserId
        }, {
            $set: {
                "members.$.transferedAt": today,
                "members.$.payAt": after7Days
            }
        });
    }

    async updatePodMemberForPayout(podId: string, memberUserId: string): Promise<UpdateWriteOpResult[]> {
        const memberUpdateResponse: UpdateWriteOpResult = await this.savingPodModel.updateOne({
            _id: podId,
            "members.user": memberUserId
        }, {
            $set: {
                "members.$.paidAt": new Date(),
            }
        });

        const savingPod: SavingPodDocument = await this.savingPodModel.findOne({
            _id: podId,
        });

        const allHasPaidOut = savingPod.members.every((member: Member) => member['paidAt']);
        if (allHasPaidOut) {
            const podUpdateResponse: UpdateWriteOpResult = await this.savingPodModel.updateOne({
                _id: podId,
            }, {
                $set: {
                    expired: true,
                    active: false
                }
            });

            return [memberUpdateResponse, podUpdateResponse];
        }

        return [memberUpdateResponse];
    }

    async sendNotificationToPodMembers(podId: string): Promise<void> {
        const savingPod = await this.getPodWithUserEmailPhone(podId);
        const members = savingPod.members.filter((member: Member) => (member.invitationStatus as any) === InvitationStatus.PENDING);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const instancesToCreate = [];
        const users: InvitationUser[] = [];
        for (const member of members) {
            const fullName = `${member.user['firstName']} ${member.user['lastName']}`
            const mobile = member.user['mobile'];
            const email = member.user['email'];
            const token = this.generateSecureToken();

            users.push({
                name: fullName,
                mobile,
                email
            });
            instancesToCreate.push({
                member: member['_id'],
                pod: podId,
                token: token,
                expiresAt: expiresAt
            });
        }

        const emailsToSend: Promise<any>[] = [];
        const messagesToSend: Promise<any>[] = [];
        const inviteInstances = await this.savingPodInviteModel.insertMany(instancesToCreate);
        for (const [index, invitation] of Array.from(inviteInstances.entries())) {
            const invitationLink = `${this.configSrvc.get('APP_URL')}/saving-pods/${invitation.token}`;
            const user = users[index];

            emailsToSend.push(this.mailerSrvc.sendMail(
                user.email,
                'Invitation to join a Saving Pod',
                'Please click the link to join a Saving Pod!',
                `<h1>Hi ${user.name}!</h1><p>Please click the link to join a Saving Pod!<p>
                    <a href="${invitationLink}" style="color: #1a82e2; text-decoration: none; font-weight: bold;">
                        Join Saving Pod
                    </a>
                </p>`,
            ));

            messagesToSend.push(this.sharedSrvc.sendMessage(user.mobile, `Please click the link to join a Saving Pod: ${invitationLink}`));
        }

        await Promise.allSettled([...emailsToSend, ...messagesToSend]);
    }

    async joinSavingPod(token: string, status: string): Promise<GenericResponse> {
        const invitation = await this.savingPodInviteModel.findOne({ 
            token, 
            isUsed: false,
            expiresAt: { $gte: new Date() } 
        });
        if (!invitation) {
            throw new NotFoundException();
        }

        const savingPod = await this.getPodInstance(invitation.pod as unknown as string);
        if (savingPod.expired) {
            throw new NotFoundException();
        }

        const response = {
            success: true
        };
        try {
            if (status = InvitationStatus.ACCEPTED) {
                savingPod.members = [...savingPod.members.map(member => {
                    const memberId = member['_id'] as unknown as Types.ObjectId;
                    if (memberId.toHexString() === invitation.member) {
                        return {
                            ...member,
                            invitationStatus: InvitationStatus.ACCEPTED
                        };
                    }
                    return member;
                })] as unknown as Member[];
            } else {
                // Member will be deleted if hasn't accepted the invitation
                savingPod.members = [...savingPod.members.filter(member => {
                    const memberId = member['_id'] as unknown as Types.ObjectId;
                    return memberId.toHexString() !== invitation.member;
                })] as unknown as Member[];
            }

            await savingPod.save();
    
            invitation.isUsed = true;
            await invitation.save();
        } catch(e) {
            response.success = false;
        }

        return response;
    }

    generateSecureToken(): string {
        return crypto.randomBytes(32).toString("hex"); // Generates a 64-character hex token
    }

    // fix to get ones with transferedAt as null
    async getSavingPodsToCharge(): Promise<SavingPodToCharge[]> {
        const today = new Date();
        const dayOfMonth = today.getDate();

        return await this.savingPodModel.aggregate([
            {
              $match: {
                active: true, 
                expired: false,
                $expr: {
                  $eq: [
                    { $dayOfMonth: "$startDate" },
                    dayOfMonth
                  ]
                },
                members: {
                  $not: { 
                    $elemMatch: { invitationStatus: { $ne: InvitationStatus.ACCEPTED } } 
                  }
                }
              }
            },
            {
                $project: {
                  amount: 1,
                  startDate: 1,
                  members: {
                    $filter: {
                      input: "$members",
                      as: "member",
                      cond: {
                        $or: [
                          { $eq: ["$$member.paidAt", null] }, // paidAt is null or missing
                          { $not: { $ifNull: ["$$member.paidAt", false] } } // Handle missing field
                        ]
                      }
                    }
                  }
                }
              },
              {
                $project: {
                  amount: 1,
                  startDate: 1,
                  members: {
                    $map: {
                      input: "$members",
                      as: "member",
                      in: {
                        user: "$$member.user",
                        order: "$$member.order"
                      }
                    }
                  }
                }
              }
        ]);
    }

    async getSavingPodForTransfer(): Promise<SavingPodToTranfer[]> {
        return await this.savingPodModel.aggregate([
            {
                $match: {
                    active: true, 
                    expired: false, 
                    members: { $exists: true, $ne: [] }
                },
            },
            {
                $project: {
                    amount: 1,
                    membersCount: { $size: "$members" },
                    matchingSubDocuments: {
                        $filter: {
                            input: "$members",
                            as: "member",
                            cond: {
                                $and: [
                                    {
                                        $and: [
                                            { $eq: [{ $type: "$$member.transferAt" }, "date"] }, // Ensure it is a valid date
                                            { $eq: [ { $dayOfMonth: "$$member.transferAt" }, { $dayOfMonth: new Date() } ] }
                                        ]
                                    },
                                    {
                                        $eq: [
                                            { $ifNull: ["$$member.payAt", null] },
                                            null,
                                        ],
                                    },
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    "matchingSubDocuments.0": { $exists: true } // Only include documents with at least one match
                }
            },
            {
                $project: {
                  user: "$matchingSubDocuments.user",
                  transferAt: "$matchingSubDocuments.transferAt"
                }
            },
            { $unwind: "$user" },
            { $unwind: "$transferAt" }
        ]);
    }

    async getSavingPodForPayout(): Promise<SavingPodForPayout[]> {
        return await this.savingPodModel.aggregate([
            {
                $match: {
                    active: true, 
                    expired: false, 
                    members: { $exists: true, $ne: [] }
                },
            },
            {
                $project: {
                    amount: 1,
                    membersCount: { $size: "$members" },
                    matchingSubDocuments: {
                        $filter: {
                            input: "$members",
                            as: "member",
                            cond: {
                                $and: [
                                    {
                                        $and: [
                                            { $eq: [{ $type: "$$member.payAt" }, "date"] }, // Ensure it is a valid date
                                            { $eq: [ { $dayOfMonth: "$$member.payAt" }, { $dayOfMonth: new Date() } ] }
                                        ]
                                    },
                                    {
                                        $eq: [
                                            { $ifNull: ["$$member.paidAt", null] },
                                            null,
                                        ],
                                    },
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    "matchingSubDocuments.0": { $exists: true } // Only include documents with at least one match
                }
            },
            {
                $project: {
                  user: "$matchingSubDocuments.user",
                  payAt: "$matchingSubDocuments.payAt"
                }
            },
            { $unwind: "$user" },
            { $unwind: "$payAt" }
        ])
    }

    private validatePodAmount(amount: number, subcriptionOptions: SubscriptionOptions) {
        const minAmount = subcriptionOptions['pod-min-amount'];
        if (amount < minAmount) {
            throw new ForbiddenException(`Minimum amount required is ${minAmount}`);
        }

        const maxAmount = subcriptionOptions['pod-max-amount'];
        if (amount > maxAmount) {
            throw new ForbiddenException(`Maximum amount cannot be more than ${maxAmount}`);
        }
    }

    private async validatePodMax(userId: string, subcriptionOptions: SubscriptionOptions): Promise<void> {
        const userPods = await this.getUserPods(userId);
        if (userPods.length >= subcriptionOptions['pods']) {
            throw new ForbiddenException('Maximum pod limit reached');
        }
    }

    private validatePodMembers(members: Member[], subcriptionOptions: SubscriptionOptions): void {
        this.validatePodMembersLength(members, subcriptionOptions);

        this.validatePodMembersDuplication(members);
    }

    private validatePodMembersLength(members: Member[], subcriptionOptions: SubscriptionOptions): void {
        if (members.length > subcriptionOptions['members']) {
            throw new ForbiddenException('Maximum pod members limit reached');
        }
    }

    private validatePodMembersDuplication(members: Member[]): void {
        const membersIds = members.map((member: Member) => member.user);
        
        if (new Set(membersIds as string[]).size !== membersIds.length) {
            throw new ForbiddenException('Duplicate members provided');
        }
    }
}
