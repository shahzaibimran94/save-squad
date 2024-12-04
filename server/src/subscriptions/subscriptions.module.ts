import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription } from 'rxjs';
import { SharedModule } from 'src/shared/shared.module';
import { SubscriptionSchema } from './schemas/subscriptions.schema';
import { UserSubscription, UserSubscriptionSchema } from './schemas/user-subscriptions.schema';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema }
    ])
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService]
})
export class SubscriptionsModule {}
