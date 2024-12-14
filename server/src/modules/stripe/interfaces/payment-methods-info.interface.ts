export interface CardInfo {
    id: string;
    brand: string;
    exp_month: number;
    exp_year: number;
    funding: string;
    last4: string;
    three_d_secure_supported: boolean;
    customer: string;
    default: boolean;
}

export interface BankInfo {
    id: string;
    account_holder_name: string;
    last4: string;
    sort_code: string;
    account: string;
    default: boolean;
}

export interface PaymentMethodsInfo {
    cards: CardInfo[];
    banks?: BankInfo[];
}