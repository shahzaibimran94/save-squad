
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Feature } from 'src/modules/subscriptions/interfaces/feature.interface';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: string;

  @Prop({ required: true })
  fee: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  features: Feature[];

  @Prop({ default: false })
  active: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);