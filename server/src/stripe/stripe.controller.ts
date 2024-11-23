import { Body, Post, Request } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { AddCardDto } from './dto/add-card.dto';
import { StripeService } from './stripe.service';

@Controller('payment')
export class StripeController {

    constructor(
        private readonly service: StripeService
    ) {}

    @Post('add-card')
    @JwtAuth()
    async addCard(@Request() req, @Body() body: AddCardDto) {
        const mobile = (req.user as JwtValidateResponse).mobile;

        return;
    }
}
