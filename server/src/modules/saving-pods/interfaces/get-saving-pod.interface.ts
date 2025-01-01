import { ObjectId } from "mongoose";

export interface SavingPodToCharge {
    _id: ObjectId;
    amount: number;
    startDate: Date;
    members: {
        user: ObjectId;
        order: number;
    }[];
}

export interface SavingPodToTranfer {
    _id: ObjectId;
    user: ObjectId;
    tranferAt: Date;
}