export interface TransactionResponse {
    user: string;
    subscription: string;
    paymentStatus: string;
    paymentResponse: string;
}

export interface PodMemberTransaction {
    user: string;
    savingPod: string;
    paid: boolean;
    amountPaid: number;
    paymentDate: Date;
    status: string;
    paymentReponse: string;
    transactionType: string;
}