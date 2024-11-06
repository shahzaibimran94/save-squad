
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  uuid: string;

  @Prop()
  name: string;

  @Prop()
  ip: string;

  @Prop()
  fcmToken: string;

  @Prop({ default: false })
  active: boolean;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
