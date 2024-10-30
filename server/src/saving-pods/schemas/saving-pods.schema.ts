
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { InvitationStatus, Member } from '../interfaces/member.interface';

export type SavingPodDocument = HydratedDocument<SavingPod>;

@Schema({ timestamps: true })
export class SavingPod {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  admin: User;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  noOfMonths: number;

  @Prop({
      type: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            invitationStatus: {
                type: String,
                enum: Object.values(InvitationStatus),
                default: InvitationStatus.PENDING
            },
            addedAt: {
                type: Date,
                default: Date.now()
            }
        }
      ],
      default: []
  })
  members: Member[];

  @Prop({ default: false })
  active: boolean;
}

export const SavingPodSchema = SchemaFactory.createForClass(SavingPod);
