import { ObjectId } from 'mongodb';

export interface IUserSubscription {
    id: string;
    name: string;
    currency: string;
    fee: number;
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