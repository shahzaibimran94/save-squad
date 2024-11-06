import { Body, Controller, ForbiddenException, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authSrvc: AuthService,
        private readonly configSrvs: ConfigService
    ) {}

    @Post('register')
    @HttpCode(200)
    async register(@Body() body: RegisterDto, @Ip() ip) {
        let countryCode = '+44';
        try {
            const ipInfo = await this.authSrvc.getIpInfo(ip);
            const localhost = ipInfo.data.bogon;
            const country = ipInfo.data['country'];
            if (!localhost && country && country !== 'GB') {
                throw new ForbiddenException();
            }
        } catch (e) {}

        const mobileNumber = body.mobile.length === 11 && body.mobile.startsWith('0') ? body.mobile.slice(1) : body.mobile;
        const payload = { mobile: `${countryCode}${mobileNumber}` };

        const userExists = await this.authSrvc.findUserWithMobile(payload.mobile);
        if (userExists) {
            throw new ForbiddenException();
        }

        const user = await this.authSrvc.register(payload);

        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const currentDateTime = new Date();
        const minutes = +this.configSrvs.get<string>('SMS_CODE_EXPIRY_MINUTES');
        const newDateTime = new Date(currentDateTime.getTime() + 1000 * 60 * minutes);
        await this.authSrvc.createVerificationInstance({
            user: user._id,
            phoneCode: verificationCode,
            phoneCodeExpiry: newDateTime
        });

        try {
            await this.authSrvc.sendMessage(payload.mobile, `Verification code: ${verificationCode}`);
        } catch (e) {}

        const token = this.authSrvc.generatToken(payload);

        return { token };
    }
}
