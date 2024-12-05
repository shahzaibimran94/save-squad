import { Body, Post, Request } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { AddCardDto } from './dto/add-card.dto';
import { VerificationSessionResponse } from './interfaces/verification-session.interface';
import { StripeService } from './stripe.service';

@Controller('payment')
export class StripeController {

    constructor(
        private readonly service: StripeService
    ) {}

    @Post('add-card')
    @JwtAuth()
    async addCard(@Request() req, @Body() body: AddCardDto) {
        await this.service.addCardPaymentMethod(req.user, body.token);

        return {
            success: true
        };
    }

    @Post('add-bank')
    @JwtAuth()
    async addBank(@Request() req, @Body() body: AddCardDto) {
        await this.service.addBank(req.user, body.token);

        return {
            success: true
        };
    }

    @Post('verification-session')
    async createVerificationSession(@Request() req): Promise<VerificationSessionResponse> {
        return await this.service.createVerificationSession(req.user);
    }

}
