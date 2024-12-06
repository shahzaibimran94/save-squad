import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAndSubscription } from 'src/subscriptions/interfaces/jwt-with-subscription.interface';
import { CreatePodDto } from './dto/create-pod.dto';
import { InvitationStatus } from './interfaces/member.interface';
import { SavingPod, SavingPodDocument } from './schemas/saving-pods.schema';

@Injectable()
export class SavingPodsService {
    
    constructor(
        @InjectModel(SavingPod.name)
        private readonly savingPodModel: Model<SavingPod>
    ) {}

    async createPod(request: JwtAndSubscription, dto: CreatePodDto): Promise<SavingPodDocument> {
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
            if (dto.members.length > subcriptionOptions['members']) {
                throw new ForbiddenException('Maximum pod members limit reached');
            }
            payload['members'] = dto.members;
        }
        
        return await this.savingPodModel.create(payload);
    }

    async getUserPods(userId: string): Promise<SavingPodDocument[]> {
        return await this.savingPodModel.find({ user: userId, expired: false });
    }

    async getUserActivePods(request: JwtAndSubscription): Promise<SavingPodDocument[]> {
        return await this.savingPodModel.find({ user: request.user.id, active: true, expired: false });
    }

    /**
     * 
     * @param request {JwtAndSubscription}
     * 
     * User will be searched in pods members data and 
     * if user is a member in any of the pods and it is active then pod will be picked
     * 
     * @returns {SavingPodDocument[]}
     */
    async getMemberPods(request: JwtAndSubscription) {
        return await this.savingPodModel.find({
            members: {
                $elemMatch: {
                    user: request.user.id,
                    invitationStatus: {
                        $ne: InvitationStatus.DECLINED
                    }
                }
            }
        });
    }
}
