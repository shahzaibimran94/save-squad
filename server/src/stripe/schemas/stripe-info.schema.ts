
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

export type StripeInfoDocument = HydratedDocument<StripeInfo>;

@Schema({ timestamps: true })
export class StripeInfo {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  accountId: string;
}

export const StripeInfoSchema = SchemaFactory.createForClass(StripeInfo);
