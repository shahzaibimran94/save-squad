import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAndSubscription } from 'src/subscriptions/interfaces/jwt-with-subscription.interface';
import { CreatePodDto } from './dto/create-pod.dto';
import { InvitationStatus, Member, MemberPod } from './interfaces/member.interface';
import { SavingPod, SavingPodDocument } from './schemas/saving-pods.schema';
import { SavingPod as ISavingPod } from './interfaces/create-pod-response.interface';
import { UpdateSavingPodDto } from './dto/update-pod.dto';
import { SubscriptionOptions } from 'src/subscriptions/interfaces/user-subscription.interface';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class SavingPodsService {
    
    constructor(
        @InjectModel(SavingPod.name)
        private readonly savingPodModel: Model<SavingPod>
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

        if (dto.members && Array.isArray(dto.members) && dto.members.length) {
            this.validatePodMembers(userId, payload, dto.members, subcriptionOptions);
        }

        const savingPodResponse = await this.savingPodModel.create(payload);
        await this.sendNotificationToPodMembers(savingPodResponse._id.toHexString());

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
    async updatePod(request: JwtAndSubscription, podId: string, dto: UpdateSavingPodDto): Promise<{ success: boolean }> {
        const savingPod = await this.getPodInstance(podId);
        if (!savingPod) {
            throw new NotFoundException();
        }

        const subcriptionOptions = request.subscription.options;

        if (dto.amount) {
            this.validatePodAmount(+dto.amount, subcriptionOptions);
        }

        if (dto.members) {
            this.validatePodMembersLength(dto.members, subcriptionOptions);
            const members = [request.user.id, ...dto.members];
            this.validatePodMembersDuplication(members, false);
        }

        const updatedDto = {
            ...dto,
            members: dto.members.map((id: string) => {
                return {
                    user: id,
                    invitationStatus: id !== request.user.id ? InvitationStatus.PENDING : InvitationStatus.ACCEPTED,
                }
            })
        }

        const updateResponse = await this.savingPodModel.findOneAndUpdate({ _id: podId }, updatedDto);
        await this.sendNotificationToPodMembers(podId);

        return {
            success: !!updateResponse.isModified
        };
    }

    async sendNotificationToPodMembers(podId: string): Promise<void> {
        const savingPod = await this.getPodWithUserEmailPhone(podId);
        
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

    private validatePodMembers(userId: string, payload: CreatePodDto, members: Member[], subcriptionOptions: SubscriptionOptions): void {
        this.validatePodMembersLength(members, subcriptionOptions);
        
        payload['members'] = [
            { 
                user: userId,
                invitationStatus: InvitationStatus.ACCEPTED,
            } as unknown as Member,
            ...members
        ];

        this.validatePodMembersDuplication(payload.members);
    }

    private validatePodMembersLength(members: Member[] | string[], subcriptionOptions: SubscriptionOptions): void {
        /**
         * Plus 1 as we will be adding user as member who is creating a pod
         */
        if (members.length + 1 > subcriptionOptions['members']) {
            throw new ForbiddenException('Maximum pod members limit reached');
        }
    }

    private validatePodMembersDuplication(members: Member[] | string[], hasUserData = true): void {
        const membersIds = !hasUserData ? (members as Member[]).map((member: Member) => member.user) : members;
        
        if (new Set(membersIds as string[]).size !== membersIds.length) {
            throw new ForbiddenException('Duplicate members provided');
        }
    }
}
