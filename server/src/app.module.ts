import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { SavingPodsModule } from './saving-pods/saving-pods.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StripeModule } from './stripe/stripe.module';
import { ReferralsModule } from './referrals/referrals.module';
import { MailerModule } from './mailer/mailer.module';
import { LoggingService } from './logger/logger.service';
import { Log, LogSchema } from './logger/schemas/logger.schema';
import { ThrottlerModule } from '@nestjs/throttler';
import { SubscriptionInterceptor } from './subscriptions/subscription.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10
        }
      ]
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MongooseModule.forRoot(`${process.env.MONGO_DB_URL}/${process.env.MONGO_DB_NAME}`),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogSchema }
    ]),
    AuthModule,
    DevicesModule,
    SubscriptionsModule,
    SavingPodsModule,
    StripeModule,
    ReferralsModule,
    MailerModule  
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    LoggingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SubscriptionInterceptor
    }
  ],
})
export class AppModule {}
