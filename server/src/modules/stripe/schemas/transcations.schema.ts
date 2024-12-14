
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/auth/schemas/user.schema';
import { SavingPod } from 'src/modules/saving-pods/schemas/saving-pods.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'SavingPod' })
  savingPod: SavingPod;

  @Prop()
  paymentStatus: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  paymentResponse: any;

  @Prop({ 
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto' 
  })
  paymentSubmitted: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
