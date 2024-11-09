
import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User>;

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

  // Method to compare passwords
  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
  
  @Virtual({
    get: function (this: User) {
      return `${this.firstName} ${this.lastName}`;
    },
  })
  fullName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware to hash password before saving
UserSchema.pre<User>('save', async function (next) {
  const user = this as User as any;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(this.password, saltRounds);

  this.password = hash;
  next();
});
