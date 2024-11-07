import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { UserVerification, UserVerificationDocument } from './schemas/verification.schema';
import * as Twilio from 'twilio';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AuthService {
    private twilioClient: Twilio.Twilio;

    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(UserVerification.name)
        private readonly verificationModel: Model<UserVerification>,
        private jwtSrvc: JwtService,
        private configSrvc: ConfigService
    ) {
        const accountSid = this.configSrvc.get<string>('TWILIO_SID');
        const authToken = this.configSrvc.get<string>('TWILIO_TOKEN');
        this.twilioClient = Twilio(accountSid, authToken);
    }

    findUserWithMobile(mobile: string): Promise<UserDocument> {
        return this.userModel.findOne({ mobile });
    }

    register(data: RegisterDto): Promise<UserDocument> {
        return this.userModel.create(data);
    }

    createVerificationInstance(payload): Promise<UserVerificationDocument> {
        return this.verificationModel.create(payload);
    }

    async verify(type: string, code: string) {

        const query = {};
        let expiryDate = '';
        let toUpdate = '';
        if (type === 'phone') {
            query['phoneCode'] = code;
            query['phoneVerified'] = false;
            expiryDate = 'phoneCodeExpiry';
            toUpdate = 'phoneVerified';
        } else if (type === 'email') {
            query['emailCode'] = code;
            query['emailVerified'] = false;
            expiryDate = 'emailCodeExpiry';
            toUpdate = 'emailVerified';
        } else {
            return false;
        }

        const verificationInstance = await this.verificationModel.findOne(query);
        if (!verificationInstance) {
            throw new NotFoundException();
        }
        
        const savedDateTime = new Date(verificationInstance[expiryDate]);
        const currentDateTime = new Date();

        if (currentDateTime < savedDateTime) {
            verificationInstance['toUpdate'] = true;
            await verificationInstance.save();
            return true;
        }

        return false;
    }

    generatToken(payload: any, expiresIn = '30d'): string {
        return this.jwtSrvc.sign(payload, { expiresIn });
    }

    async getIpInfo(clientIp: string) {
        const IP_INFO_TOKEN = this.configSrvc.get<string>('IP_INFO_TOKEN')
        return await axios.get(`https://ipinfo.io/${clientIp}?token=${IP_INFO_TOKEN}`);
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
          throw new InternalServerErrorException('Failed to send SMS');
        }
      }
}
