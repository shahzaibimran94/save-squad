import { Body, Controller, ForbiddenException, HttpCode, Ip, Post, Put, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ForgotPasswordResponseDto, ResetPasswordDto, ResetPasswordResponseDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRequirements } from './dto/user-requirements.dto';
import { UserVerifyDto } from './dto/user-verify.dto';
import { JwtValidateResponse } from './interfaces/jwt-validate-response.interface';
import { JwtAuth } from './jwt-auth.decorator';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authSrvc: AuthService,
    ) {}

    @Post('login')
    @HttpCode(200)
    async login(@Body() body: LoginDto) {
        return this.authSrvc.loginUser(body);
    }

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
    async updateUser(@Request() req, @Ip() ip, @Body() body: UpdateUserDto) {
        await this.authSrvc.updateUser((req.user as JwtValidateResponse).mobile, body, ip);
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

    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {

        const getToken = await this.authSrvc.forgotPassword(body);

        return {
            token: getToken.token
        }
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
        return await this.authSrvc.resetPassword(body);
    }

    @Get('requirements')
    @JwtAuth()
    async userRequirements(@Request() req): Promise<UserRequirements> {
        return await this.authSrvc.userRequirements((req.user as JwtValidateResponse).mobile);
    }

}
