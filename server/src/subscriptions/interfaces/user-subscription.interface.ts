import { ObjectId } from 'mongodb';

export interface IUserSubscription {
    name: string;
    currency: string;
    options: SubscriptionOptions;
}

export interface SubscriptionOptions {
    [key: string]: number;
}

export interface UserSubscriptionFees {
    user: ObjectId;
    subscription: {
        _id: ObjectId;
        fee: number;
    };
}