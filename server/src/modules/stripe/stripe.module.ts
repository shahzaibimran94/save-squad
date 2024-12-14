import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from 'src/modules/shared/shared.module';
import { RetryTransaction, RetryTransactionSchema } from './schemas/retry-transaction.schema';
import { SavingPodMemberTransaction, SavingPodMemberTransactionSchema } from './schemas/saving-pod-member-transactions.schema';
import { StripeInfo, StripeInfoSchema } from './schemas/stripe-info.schema';
import { Transaction, TransactionSchema } from './schemas/transcations.schema';
import { SubscriptionTransaction, SubscriptionTransactionSchema } from './schemas/user-subscription-transaction.schema';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: StripeInfo.name, schema: StripeInfoSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: SavingPodMemberTransaction.name, schema: SavingPodMemberTransactionSchema },
      { name: SubscriptionTransaction.name, schema: SubscriptionTransactionSchema },
      { name: RetryTransaction.name, schema: RetryTransactionSchema }
    ])
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService]
})
export class StripeModule {}
