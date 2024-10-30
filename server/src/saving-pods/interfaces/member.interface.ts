import mongoose from 'mongoose';

export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
}

export interface Member {
    user: mongoose.Schema.Types.ObjectId;
    invitationStatus: { type: String, default: InvitationStatus.PENDING };
    addedAt: Date;
}