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