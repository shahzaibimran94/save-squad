import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserVerification, UserVerificationSchema } from './schemas/verification.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { MailerModule } from 'src/modules/mailer/mailer.module';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { StripeModule } from 'src/modules/stripe/stripe.module';
import { SharedModule } from 'src/modules/shared/shared.module';

@Global()
@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserVerification.name, schema: UserVerificationSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    HttpModule,
    MailerModule,
    StripeModule,
    SharedModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy]
})
export class AuthModule {}
