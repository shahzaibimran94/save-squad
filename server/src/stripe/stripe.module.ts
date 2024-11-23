import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavingPodMemberTransaction, SavingPodMemberTransactionSchema } from './schemas/saving-pod-member-transactions.schema';
import { StripeInfo, StripeInfoSchema } from './schemas/stripe-info.schema';
import { Transaction, TransactionSchema } from './schemas/transcations.schema';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StripeInfo.name, schema: StripeInfoSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: SavingPodMemberTransaction.name, schema: SavingPodMemberTransactionSchema }
    ])
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService]
})
export class StripeModule {}
