import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUserSubscription, UserSubscriptionFees } from 'src/modules/subscriptions/interfaces/user-subscription.interface';
import { SubscriptionsService } from 'src/modules/subscriptions/subscriptions.service';
import * as Twilio from 'twilio';
import { JwtValidateResponse } from '../auth/interfaces/jwt-validate-response.interface';

@Injectable()
export class SharedService {
    private twilioClient: Twilio.Twilio;

    constructor(
        private readonly configSrvc: ConfigService,
        private readonly subscriptionSrvc: SubscriptionsService
    ) {
        const accountSid = this.configSrvc.get<string>('TWILIO_SID');
        const authToken = this.configSrvc.get<string>('TWILIO_TOKEN');
        this.twilioClient = Twilio(accountSid, authToken);
    }

    async sendMessage(to: string, body: string): Promise<void> {
        try {
          const from = this.configSrvc.get<string>('TWILIO_PHONE_NUMBER');
          await this.twilioClient.messages.create({
            body,
            from,
            to,
          });
        } catch (error) {
        //   throw new InternalServerErrorException('Failed to send SMS');
        }
    }

    async getUserSubscriptions(): Promise<UserSubscriptionFees[]> {
      return await this.subscriptionSrvc.getAllSubscribedUsers();
    }

    async getUserSubscription(user: JwtValidateResponse): Promise<IUserSubscription> {
      return await this.subscriptionSrvc.getUserSubscription(user);
    }
}