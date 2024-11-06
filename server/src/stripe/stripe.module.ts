import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavingPodMemberTransaction, SavingPodMemberTransactionSchema } from './schemas/saving-pod-member-transactions.schema';
import { Transaction, TransactionSchema } from './schemas/transcations.schema';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: SavingPodMemberTransaction.name, schema: SavingPodMemberTransactionSchema }
    ])
  ],
  controllers: [StripeController],
  providers: [StripeService]
})
export class StripeModule {}
