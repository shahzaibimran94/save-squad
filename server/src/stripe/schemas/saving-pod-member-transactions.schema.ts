
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { SavingPod } from 'src/saving-pods/schemas/saving-pods.schema';

export type SavingPodMemberTransactionDocument = HydratedDocument<SavingPodMemberTransaction>;

@Schema({ timestamps: true })
export class SavingPodMemberTransaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'SavingPod' })
  savingPod: SavingPod;

  @Prop({ default: false })
  paid: boolean;

  @Prop({ default: 0.00 })
  amountPaid: number;

  @Prop({ default: Date.now() })
  paymentDate: Date;
}

export const SavingPodMemberTransactionSchema = SchemaFactory.createForClass(SavingPodMemberTransaction);
