
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Subscription } from 'rxjs';
import { User } from 'src/auth/schemas/user.schema';

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' })
  subscription: Subscription;

  @Prop({ required: true })
  activationDate: Date;

  @Prop({ default: false })
  active: boolean;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);