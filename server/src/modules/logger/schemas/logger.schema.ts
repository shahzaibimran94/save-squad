import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogDocument = Log & Document;

@Schema()
export class Log {
  @Prop({ required: true })
  statusCode: number;

  @Prop({ required: true })
  path: string;

  @Prop()
  method: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  stack: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);