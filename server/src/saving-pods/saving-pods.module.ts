import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavingPodsController } from './saving-pods.controller';
import { SavingPodsService } from './saving-pods.service';
import { SavingPod, SavingPodSchema } from './schemas/saving-pods.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavingPod.name, schema: SavingPodSchema }
    ])
  ],
  controllers: [SavingPodsController],
  providers: [SavingPodsService]
})
export class SavingPodsModule {}
