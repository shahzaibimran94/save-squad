import { Body, Post, Request, Logger } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { JwtAuth } from 'src/modules/auth/jwt-auth.decorator';
import { AddCardDto } from './dto/add-card.dto';
import { VerificationSessionResponse } from './interfaces/verification-session.interface';
import { StripeService } from './stripe.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Controller('payment')
export class StripeController {
    private readonly logger = new Logger(StripeController.name);

    constructor(
        private readonly service: StripeService
    ) {}

    @Get('info')
    @JwtAuth()
    async getPaymentInfo(@Request() req) {
        return await this.service.getPaymentInfo(req);
    }

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

    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    chargeForSubscriptions() {
        if (process.env.NODE_ENV !== 'development') {
            this.logger.debug(`${new Date().toISOString()} Charging users for subscriptions.`);
            this.service.chargeUsersForSubscriptions();
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    retryChargeForSubscription() {
        if (process.env.NODE_ENV !== 'development') {
            this.logger.debug(`${new Date().toISOString()} Retry charging users for subscriptions.`);
            this.service.retryFailedSubscriptionsCharge();
        }
    }
}
