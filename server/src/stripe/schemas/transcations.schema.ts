
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { SavingPod } from 'src/saving-pods/schemas/saving-pods.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: SavingPod.name })
  savingPod: SavingPod;

  @Prop()
  paymentStatus: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  paymentResponse: any;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
