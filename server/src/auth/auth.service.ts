import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { UserVerification, UserVerificationDocument } from './schemas/verification.schema';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(UserVerification.name)
        private readonly verificationModel: Model<UserVerification>,
        private jwtSrvc: JwtService,
        private configSrvc: ConfigService
    ) {}

    findUserWithMobile(mobile: string): Promise<UserDocument> {
        return this.userModel.findOne({ mobile });
    }

    register(data: RegisterDto): Promise<UserDocument> {
        return this.userModel.create(data);
    }

    createVerificationInstance(payload): Promise<UserVerificationDocument> {
        return this.verificationModel.create(payload);
    }

    generatToken(payload: any, expiresIn = '30d'): string {
        return this.jwtSrvc.sign(payload, { expiresIn });
    }

    async getIpInfo(clientIp: string) {
        const IP_INFO_TOKEN = this.configSrvc.get<string>('IP_INFO_TOKEN')
        return await axios.get(`https://ipinfo.io/${clientIp}?token=${IP_INFO_TOKEN}`);
    }
}
