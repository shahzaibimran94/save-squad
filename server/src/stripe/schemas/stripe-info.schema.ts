
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

export type StripeInfoDocument = HydratedDocument<StripeInfo>;

@Schema({ timestamps: true })
export class StripeInfo {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop()
  customerId: string;

  @Prop()
  accountId: string;
}

export const StripeInfoSchema = SchemaFactory.createForClass(StripeInfo);
