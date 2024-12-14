
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/auth/schemas/user.schema';
import { PaymentStatus } from './saving-pod-member-transactions.schema';
import { Subscription } from '../../subscriptions/schemas/subscriptions.schema';
import { PaymentSubmitType } from 'src/utils/enums/payment-submit-type.enum';

export type SubscriptionTransactionDocument = HydratedDocument<SubscriptionTransaction>;

@Schema({ timestamps: true })
export class SubscriptionTransaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' })
  subscription: Subscription;

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,  
  })
  paymentStatus: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  paymentResponse: any;

  @Prop({ 
    type: String,
    enum: Object.values(PaymentSubmitType),
    default: PaymentSubmitType.AUTO
  })
  paymentSubmitted: string;
}

export const SubscriptionTransactionSchema = SchemaFactory.createForClass(SubscriptionTransaction);
