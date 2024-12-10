
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { SavingPod } from './saving-pods.schema';

export type SavingPodInvitationDocument = HydratedDocument<SavingPodInvitation>;

@Schema({ timestamps: true })
export class SavingPodInvitation {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'SavingPod', required: true })
  pod: SavingPod;

  @Prop({ required: true })
  member: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: true })
  active: boolean;
}

export const SavingPodInvitationSchema = SchemaFactory.createForClass(SavingPodInvitation);
