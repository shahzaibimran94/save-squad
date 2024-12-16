import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface EmailResponse {
  error: boolean;
  message: string;
}

@Injectable()
export class MailerService {

  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<EmailResponse> {
    const senderEmail = this.configService.get<string>('SENDGRID_SENDER_EMAIL');

    const msg = {
      to, // Recipient email
      from: senderEmail, // Verified sender email (must match SendGrid settings)
      subject, // Email subject
      text, // Plain text content
      html, // HTML content (optional)
    };

    try {
        // Send email using SendGrid
        await sgMail.send(msg);

        return {
          error: false,
          message: `Email sent successfully to ${msg.to}`
        };
    } catch (error) {
        return {
          error: true,
          message: error.message
        };
    }
  }
}
