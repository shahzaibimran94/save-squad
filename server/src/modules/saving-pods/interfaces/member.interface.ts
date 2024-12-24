import mongoose from 'mongoose';

export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
}

export interface Member {
    _id?: mongoose.Schema.Types.ObjectId;
    user: mongoose.Schema.Types.ObjectId | string;
    name?: string;
    invitationStatus?: string;
    addedAt?: Date;
    order?: number;
    chargedAt?: Date;
    transferAt?: Date;
    transferedAt?: Date;
    payAt?: Date;
    paidAt?: Date;
}

export interface MemberPod {
    amount: number;
    startDate: Date | null;
    members: Omit<Member, 'addedAt'>[]
}