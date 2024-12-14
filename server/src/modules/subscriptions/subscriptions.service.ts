import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtValidateResponse } from 'src/modules/auth/interfaces/jwt-validate-response.interface';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscriptions.schema';
import { Subscription } from './schemas/subscriptions.schema';
import mongoose from 'mongoose';
import { IUserSubscription, UserSubscriptionFees } from './interfaces/user-subscription.interface';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class SubscriptionsService {

    constructor(
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @InjectModel(UserSubscription.name)
        private readonly userSubscriptionModel: Model<UserSubscription>,
    ) {}

    async saveUserSubscription(user: JwtValidateResponse, id: string): Promise<UserSubscriptionDocument> {
        const userSubscription = await this.getUserSubscription(user);
        if (userSubscription) {
            throw new ConflictException();
        }

        const today = new Date(); // Get the current date
        const currentDay = today.getDate(); // Get the day of the month

        return await this.userSubscriptionModel.create({
            user: user.id,
            subscription: id,
            // I have added this to handle leap year
            activationDate: currentDay > 28 ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : Date.now(),
            active: true
        });
    }

    async getUserSubscription(user: JwtValidateResponse): Promise<IUserSubscription> {
        const userSubscription: UserSubscription = await this.userSubscriptionModel.findOne({ user: user.id });
        if (!userSubscription) {
            throw new BadRequestException();
        }

        return await this.getUserReadableSubscription((userSubscription.subscription as unknown as mongoose.Schema.Types.ObjectId));
    }

    /**
     * 
     * User Subscribed according to registered date will be returned
     * If today is 15th than user subscribed on 15th will be returned
     * 
     * @returns 
     */
    async getAllSubscribedUsers(): Promise<UserSubscriptionFees[]> {
        return await this.userSubscriptionModel
        .find({ 
            active: true,
            $expr: {
                $eq: [
                    { $dayOfMonth: "$createdAt" },
                    { $dayOfMonth: new Date() }
                ]
            } 
        })
        .populate({
            path: "subscription",
            select: "fee"
        })
        .select('user subscription -_id');
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
