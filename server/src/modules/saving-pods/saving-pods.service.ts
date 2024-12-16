import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
        .find({ user: request.user.id, active: true, expired: false })
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
            active: true, expired: false,
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

    async joinSavingPod(token: string): Promise<GenericResponse> {
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
