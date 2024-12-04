export interface IUserSubscription {
    name: string;
    currency: string;
    options: {
        [key: string]: number;
    };
}