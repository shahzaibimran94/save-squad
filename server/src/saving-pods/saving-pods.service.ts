import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAndSubscription } from 'src/subscriptions/interfaces/jwt-with-subscription.interface';
import { CreatePodDto } from './dto/create-pod.dto';
import { InvitationStatus, Member, MemberPod } from './interfaces/member.interface';
import { SavingPod, SavingPodDocument } from './schemas/saving-pods.schema';
import { SavingPod as ISavingPod } from './interfaces/create-pod-response.interface';

@Injectable()
export class SavingPodsService {
    
    constructor(
        @InjectModel(SavingPod.name)
        private readonly savingPodModel: Model<SavingPod>
    ) {}

    async createPod(request: JwtAndSubscription, dto: CreatePodDto): Promise<ISavingPod> {
        const userId = request.user.id;
        const userPods = await this.getUserPods(userId);

        const subcriptionOptions = request.subscription.options;

        const minAmount = subcriptionOptions['pod-min-amount'];
        if (+dto.amount < minAmount) {
            throw new ForbiddenException(`Minimum amount required is ${minAmount}`);
        }

        const maxAmount = subcriptionOptions['pod-max-amount'];
        if (+dto.amount > maxAmount) {
            throw new ForbiddenException(`Maximum amount cannot be more than ${maxAmount}`);
        }

        if (userPods.length >= subcriptionOptions['pods']) {
            throw new ForbiddenException('Maximum pod limit reached');
        }

        const payload = {
            user: userId,
            amount: dto.amount
        };

        if (dto.members && Array.isArray(dto.members) && dto.members.length) {
            // Plus 1 as we will be adding admin in members
            if (dto.members.length + 1 > subcriptionOptions['members']) {
                throw new ForbiddenException('Maximum pod members limit reached');
            }
            payload['members'] = [
                { 
                    user: userId,
                    invitationStatus: InvitationStatus.ACCEPTED,
                },
                ...dto.members
            ];

            const membersIds = payload['members'].map((member: Member) => member.user);
            if (new Set(membersIds).size !== membersIds.length) {
                throw new ForbiddenException('Duplicate members provided');
            }
        }

        const savingPodResponse = await this.savingPodModel.create(payload);

        return await this.getPod(savingPodResponse._id.toHexString());
    }

    async getUserPods(userId: string): Promise<SavingPodDocument[]> {
        return await this.savingPodModel.find({ user: userId, expired: false });
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
}
