import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { Referral, ReferralSchema } from './schemas/referrals.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema }
    ])
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService]
})
export class ReferralsModule {}
