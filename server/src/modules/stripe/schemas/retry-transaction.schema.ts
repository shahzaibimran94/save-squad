import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { SubscriptionTransaction } from './user-subscription-transaction.schema';

export type RetryTransactionDocument = HydratedDocument<RetryTransaction>;

@Schema({ timestamps: true })
export class RetryTransaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionTransaction', required: true })
  transactionId: SubscriptionTransaction;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: "[]" })
  notes: any;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: true })
  active: boolean;
}

export const RetryTransactionSchema = SchemaFactory.createForClass(RetryTransaction);
