
import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  firstName: string;

  @Prop()
  lastName: number;

  @Prop()
  gender: string;

  @Prop()
  dob: Date;

  @Prop({ required: true })
  mobile: string;

  @Prop()
  addressLine1: string;

  @Prop()
  addressLine2: string;

  @Prop()
  postCode: string;

  @Prop()
  country: string;

  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop()
  pin: string;

  @Prop()
  displayPicture: string;
  
  @Prop({ default: false })
  active: boolean;

  @Virtual({
    get: function (this: User) {
      return `${this.firstName} ${this.lastName}`;
    },
  })
  fullName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
