import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class SharedService {
    private twilioClient: Twilio.Twilio;

    constructor(
        private readonly configSrvc: ConfigService,
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
}