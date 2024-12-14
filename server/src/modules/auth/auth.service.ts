import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegisterDto } from './dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { UserVerification, UserVerificationDocument } from './schemas/verification.schema';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailerService } from 'src/modules/mailer/mailer.service';
import { ForbiddenException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from './interfaces/login.interface';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordReset, PasswordResetDocument } from './schemas/password-reset.schema';
import { v4 as uuidv4 } from 'uuid';
import { UserRequirements } from './dto/user-requirements.dto';
import { ContactVerified } from './dto/user-verify.dto';
import { StripeService } from 'src/modules/stripe/stripe.service';
import { SharedService } from 'src/modules/shared/shared.service';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(UserVerification.name)
        private readonly verificationModel: Model<UserVerification>,
        @InjectModel(PasswordReset.name)
        private readonly pwdModel: Model<PasswordReset>,
        private readonly jwtSrvc: JwtService,
        private readonly configSrvc: ConfigService,
        private readonly mailerSrvc: MailerService,
        private readonly stripeSrvc: StripeService,
        private readonly sharedSrvs: SharedService
    ) {}

    async isUKCustomer(ip: string) {
        const ipInfo = await this.getIpInfo(ip);
        const localhost = ipInfo.data.bogon;
        const country = ipInfo.data['country'];
        if (!localhost && country && country !== 'GB') {
            throw new ForbiddenException();
        }
    }

    async loginUser(payload: LoginDto): Promise<LoginResponse> {
        const user = await this.userModel.findOne({ mobile: payload.mobile });

        if (!user) {
            throw new NotFoundException();
        }

        const isPasswordValid = await (user as UserDocument).comparePassword(payload.password);
        if (!isPasswordValid) {
            throw new ForbiddenException();
        }

        const jwtToken = await this.generatToken(payload.mobile);

        return {
            token: jwtToken
        };
    }

    findUser(payload: RegisterDto) {
        const { email, mobile } = payload;

        return this.userModel.findOne({
            email,
            mobile: `+44${mobile}`
        });
    }

    formatMobileNumber(mobile: string) {
        return mobile.length === 11 && mobile.startsWith('0') ? mobile.slice(1) : mobile;
    }

    findUserWithMobile(mobile: string): Promise<UserDocument> {
        return this.userModel.findOne({ mobile });
    }

    async register(data: RegisterDto): Promise<{ token: string }> {
        const user = await this.userModel.create(data);

        await this.initiateVerification(user._id, 'phone', data.mobile);
        await this.initiateVerification(user._id, 'email', data.email);

        const jwtToken = await this.generatToken(data.mobile);

        return {
            token: jwtToken
        };
    }

    async initiateVerification(user_id: Types.ObjectId | string, type: string, value: string) {
        if (['phone', 'email'].indexOf(type) < 0) {
            throw new ForbiddenException();
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const currentDateTime = new Date();
        const minutes = +this.configSrvc.get<string>(`${type === 'phone' ? 'SMS' : 'EMAIL'}_CODE_EXPIRY_MINUTES`);
        const newDateTime = new Date(currentDateTime.getTime() + 1000 * 60 * minutes);
        const instance = await this.getVerificationInstance(user_id);
        if (instance) {
            instance[`${type}Code`] = String(verificationCode);
            instance[`${type}CodeExpiry`] = newDateTime;
            instance.save();
        } else {
            await this.createVerificationInstance({
                user: user_id,
                [`${type}Code`]: verificationCode,
                [`${type}CodeExpiry`]: newDateTime
            });
        }

        if (type === 'phone') {
            await this.sharedSrvs.sendMessage(value, `Save Squad Verification Code: ${verificationCode}`);
        } else if (type === 'email') {
            await this.mailerSrvc.sendMail(
                value,
                'Welcome to Save Squad',
                'Thank you for joining our service!',
                `<h1>Welcome!</h1><p>Thank you for joining our service!</p><p>Verification Code: ${verificationCode}</p>`,
            );
        }
    }

    async getVerificationInstance(user_id: Types.ObjectId | string) {
        return this.verificationModel.findOne({ user: user_id });
    }

    createVerificationInstance(payload): Promise<UserVerificationDocument> {
        return this.verificationModel.create(payload);
    }

    async verify(type: string, code: string) {
        if (['phone', 'email'].indexOf(type) < 0) {
            throw new ForbiddenException();
        }

        const expiryDate = `${type}CodeExpiry`;
        const toUpdate = `${type}Verified`;
        const query = {
            [`${type}Code`]: code,
            [toUpdate]: false
        };

        const verificationInstance = await this.verificationModel.findOne(query);
        if (!verificationInstance) {
            throw new NotFoundException();
        }
        
        const savedDateTime = new Date(verificationInstance[expiryDate]);
        const currentDateTime = new Date();

        if (currentDateTime < savedDateTime) {
            verificationInstance[toUpdate] = true;
            await verificationInstance.save();
            return true;
        }

        return false;
    }

    async updateUser(mobile: string, payload: UpdateUserDto, ip: string) {
        const user: UserDocument = await this.userModel.findOne({ mobile });

        for (const key of Object.keys(payload)) {
            user[key] = payload[key];
        }

        
        if (payload.mobile) {
            await this.initiateVerification(user._id, 'phone', payload.mobile);
        }
        if (payload.email) {
            await this.initiateVerification(user._id, 'email', payload.email);
        }

        await this.initiateStripeRegister(user, ip);

        return user.save();
    }

    async initiateStripeRegister(user: UserDocument, ip: string) {
        let register = true;

        const requiredFields = ['firstName', 'lastName', 'email', 'mobile', 'gender', 'dob', 'addressLine1', 'addressLine2', 'city', 'country', 'postCode'];

        for(const field of requiredFields) {
            if (!user[field]) {
                register = false;
                break;
            }
        }

        if (register) {
            await this.stripeSrvc.createAccount(user, ip);
        }
    }

    generatToken(payload: any, expiresIn = '30d'): string {
        return this.jwtSrvc.sign({
            data: payload,
        }, { expiresIn });
    }

    async getIpInfo(clientIp: string) {
        const IP_INFO_TOKEN = this.configSrvc.get<string>('IP_INFO_TOKEN')
        return await axios.get(`https://ipinfo.io/${clientIp}?token=${IP_INFO_TOKEN}`);
    }

    async forgotPassword(payload: ForgotPasswordDto): Promise<PasswordResetDocument> {
        const { email } = payload;
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new NotFoundException();
        }

        const currentDateTime = new Date();

        const pwdResetInstance = await this.pwdModel.findOne({
            user: user._id,
            expiry: {
                $gt: currentDateTime,
            },
        });

        if (pwdResetInstance) {
            return pwdResetInstance;
        }

        const minutes = +this.configSrvc.get<string>('EMAIL_CODE_EXPIRY_MINUTES');

        return this.pwdModel.create({
            user: user._id,
            token: uuidv4(),
            expiry: new Date(currentDateTime.getTime() + 1000 * 60 * minutes),
        });
    }

    async resetPassword(payload: ResetPasswordDto) {
        let success = false;
        const { token, newPassword } = payload;

        const pwdResetInstance = await this.pwdModel.findOne({
            token: token,
            expiry: {
                $gt: new Date(),
            },
        });

        if (!pwdResetInstance) {
            throw new NotFoundException();
        }

        const user = await this.userModel.findById(pwdResetInstance.user);
        if (!user) {
            throw new NotFoundException();
        }

        try {
            user.password = newPassword;
            await user.save();
            success = true;
        } catch (e) {}

        return {
            success: success
        };
    }

    async userRequirements(mobile: string): Promise<UserRequirements> {
        const response: UserRequirements = {
            phoneVerified: false,
            emailVerified: false,
            profileCompleted: false,
            hasPaymentMethods: false,
            userVerified: false,
        };

        const user = await this.userModel.findOne({ mobile });
        if (!user) {
            throw new NotFoundException();
        }

        const userId: string = user._id.toHexString();

        const { phone, email } = await this.contactVerified(userId);
        response.phoneVerified = phone;
        response.emailVerified = email;

        response.profileCompleted = this.profileCompeted(user);

        response.hasPaymentMethods = await this.stripeSrvc.userHasPaymentMethods(userId);
        
        response.userVerified = user.active;

        return response;
    }

    async contactVerified(userId: string): Promise<ContactVerified> {
        const verificationInstance = await this.getVerificationInstance(userId);
        if (!verificationInstance) {
            throw new NotFoundException();
        }

        return  {
            phone: verificationInstance.phoneVerified,
            email: verificationInstance.emailVerified
        };
    }

    profileCompeted(user: User): boolean {
        let completed = false;
        const { dob, address, gender, displayPicture } = user;

        if (dob && address && gender && displayPicture) {
            if (address.addressLine1 && address.city && address.country && address.postcode) {
                completed = true;
            }
        }

        return completed;
    }
}
