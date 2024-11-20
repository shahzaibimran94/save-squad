
import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User> & {
  comparePassword: (plainPassword: string) => Promise<boolean>;
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

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

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
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

// Middleware to hash password on save
UserSchema.pre<UserDocument>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(this.password, saltRounds);

  this.password = hash;
  next();
});

UserSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
}