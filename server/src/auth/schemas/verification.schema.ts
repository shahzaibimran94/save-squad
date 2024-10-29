
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type UserVerificationDocument = HydratedDocument<UserVerification>;

@Schema()
export class UserVerification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: '' })
  phoneCode: string;

  @Prop({ default: '' })
  emailCode: string;
}

export const UserVerificationSchema = SchemaFactory.createForClass(UserVerification);
