import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { SharedService } from 'src/shared/shared.service';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscriptions.schema';
import { Subscription } from './schemas/subscriptions.schema';
import mongoose from 'mongoose';
import { IUserSubscription } from './interfaces/user-subscription.interface';

@Injectable()
export class SubscriptionsService {

    constructor(
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @InjectModel(UserSubscription.name)
        private readonly userSubscriptionModel: Model<UserSubscription>,
        private readonly sharedSrvc: SharedService
    ) {}

    async saveUserSubscription(user: JwtValidateResponse, id: string): Promise<UserSubscriptionDocument> {
        const _user = await this.sharedSrvc.getUserByMobile(user.mobile);
        if (!user) {
            throw new BadRequestException();
        }

        return await this.userSubscriptionModel.create({
            user: _user.id,
            subscription: id,
            activationDate: Date.now(),
            active: true
        });
    }

    async getUserSubscription(user: JwtValidateResponse): Promise<IUserSubscription> {
        const _user = await this.sharedSrvc.getUserByMobile(user.mobile);
        if (!user) {
            throw new BadRequestException();
        }

        const userSubscription: UserSubscription = await this.userSubscriptionModel.findOne({ user: _user._id });
        if (!userSubscription) {
            throw new BadRequestException();
        }

        return await this.getUserReadableSubscription((userSubscription.subscription as unknown as mongoose.Schema.Types.ObjectId));
    }

    private async getUserReadableSubscription(subscriptionId: mongoose.Schema.Types.ObjectId): Promise<IUserSubscription> {
        const subscription = await this.subscriptionModel.findOne({ _id: subscriptionId });
        if (!subscription) {
            throw new BadRequestException();
        }

        const toReturn = {
            name: subscription.name,
            currency: subscription.currency,
            options: {}
        };

        for (const feature of subscription.features) {
            toReturn.options[feature.system] = feature.value;
        }

        return toReturn;
    }

}
