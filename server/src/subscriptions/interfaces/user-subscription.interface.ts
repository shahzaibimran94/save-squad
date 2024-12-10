export interface IUserSubscription {
    name: string;
    currency: string;
    options: SubscriptionOptions;
}

export interface SubscriptionOptions {
    [key: string]: number;
}