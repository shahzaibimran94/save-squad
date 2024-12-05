
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { InvitationStatus, Member } from '../interfaces/member.interface';

export type SavingPodDocument = HydratedDocument<SavingPod>;

@Schema({ timestamps: true })
export class SavingPod {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  amount: number;

  @Prop()
  startDate: Date;

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
  expired: boolean;

  @Prop({ default: false })
  active: boolean;
}

export const SavingPodSchema = SchemaFactory.createForClass(SavingPod);
