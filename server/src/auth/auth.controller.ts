import { Body, Controller, ForbiddenException, HttpCode, Ip, Post, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVerifyDto } from './dto/user-verify.dto';
import { JwtAuth } from './jwt-auth.decorator';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authSrvc: AuthService,
        private readonly configSrvs: ConfigService
    ) {}

    @Post('register')
    @HttpCode(200)
    async register(@Body() body: RegisterDto, @Ip() ip) {

        const isUserExist = await this.authSrvc.findUser(body);
        if (isUserExist) {
            throw new ForbiddenException();
        }
        await this.authSrvc.isUKCustomer(ip);

        const mobileNumber = this.authSrvc.formatMobileNumber(body.mobile);
        const payload = { 
            ...body,
            mobile: `+44${mobileNumber}` 
        };

        return await this.authSrvc.register(payload);
    }

    @Put('user')
    @JwtAuth()
    @HttpCode(200)
    async updateUser(@Body() body: UpdateUserDto) {
        await this.authSrvc.updateUser({ email: 'shahzaib@gmail.com' }, '672bd0c2a8cca584b1986512');
        return;
    }

    @Post('verify')
    @JwtAuth()
    @HttpCode(200)
    async verifyUser(@Body() body: UserVerifyDto) {
        let verified = false;

        if (body.phoneCode) {
            verified = await this.authSrvc.verify('phone', body.phoneCode);
        }

        if (body.emailCode) {
            verified = await this.authSrvc.verify('email', body.emailCode);
        }

        return { verified };
    }
}
