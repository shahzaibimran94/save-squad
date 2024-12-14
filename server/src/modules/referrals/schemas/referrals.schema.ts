
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/auth/schemas/user.schema';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ timestamps: true })
export class Referral {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  referrer: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  referree: User;

  @Prop({ required: true })
  code: string;

  @Prop({
      type: String,
      enum: ['pending', 'accepted', 'declined', 'converted'],
      default: 'pending'
  })
  referralStatus: string;

  @Prop()
  referDate: Date;

  @Prop({ default: 30 })
  validity: number; // No of days

  @Prop({
      type: String,
      enum: ['unclaimed', 'claimed', 'expired'],
      default: 'unclaimed'
  })
  rewardStatus: string;

  @Prop()
  rewardClaimDate: Date;
  
  @Prop({ default: false })
  active: boolean;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
