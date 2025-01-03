import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from 'src/modules/mailer/mailer.module';
import { SharedModule } from 'src/modules/shared/shared.module';
import { SavingPodsController } from './saving-pods.controller';
import { SavingPodsService } from './saving-pods.service';
import { SavingPodInvitation, SavingPodInvitationSchema } from './schemas/saving-pod-invitation.schema';
import { SavingPod, SavingPodSchema } from './schemas/saving-pods.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavingPod.name, schema: SavingPodSchema },
      { name: SavingPodInvitation.name, schema: SavingPodInvitationSchema }
    ]),
    MailerModule,
    SharedModule
  ],
  controllers: [SavingPodsController],
  providers: [SavingPodsService],
  exports: [SavingPodsService]
})
export class SavingPodsModule {}
