import { Module } from '@nestjs/common';
import { SubscriptionsModule } from 'src/modules/subscriptions/subscriptions.module';
import { SharedService } from './shared.service';

@Module({
    imports: [
        SubscriptionsModule,
    ],
    providers: [SharedService], 
    exports: [SharedService],  
})
export class SharedModule {}