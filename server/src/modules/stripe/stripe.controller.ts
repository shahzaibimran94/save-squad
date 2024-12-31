import { Body, Post, Request, Logger } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { JwtAuth } from 'src/modules/auth/jwt-auth.decorator';
import { AddCardDto } from './dto/add-card.dto';
import { VerificationSessionResponse } from './interfaces/verification-session.interface';
import { StripeService } from './stripe.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Environment } from 'src/utils/enums/environment.enum';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { PaymentType } from 'src/utils/enums/payment-type.enum';
import { SavingPodsService } from '../saving-pods/saving-pods.service';

@Controller('payment')
export class StripeController {
    private isDevelopment: boolean;
    private readonly logger = new Logger(StripeController.name);

    constructor(
        private readonly service: StripeService,
        private readonly configSrvs: ConfigService
    ) {
        this.isDevelopment = this.configSrvs.get<string>('NODE_ENV') === Environment.DEVELOPMENT;
    }

    @Get('info')
    @JwtAuth()
    async getPaymentInfo(@Request() req) {
        return await this.service.getPaymentInfo(req);
    }

    @Post('add-card')
    @JwtAuth()
    async addCard(@Request() req, @Body() body: AddCardDto) {
        await this.service.addCardPaymentMethod(req.user, body);

        return {
            success: true
        };
    }

    @Post('add-bank')
    @JwtAuth()
    async addBank(@Request() req, @Body() body: AddCardDto) {
        await this.service.addBank(req.user, body);

        return {
            success: true
        };
    }

    @Post('verification-session')
    async createVerificationSession(@Request() req): Promise<VerificationSessionResponse> {
        return await this.service.createVerificationSession(req.user);
    }

    @Post('pay')
    @JwtAuth()
    async payManually(@Request() req, @Body() body: ManualPaymentDto) {
        if (body.type === PaymentType.SUBSCRIPTION) {
            return await this.service.payManually(req.user);
        } else if (body.type === PaymentType.SAVING_POD) {
            return {
                message: 'Not implemented'
            };
        }

        return {
            message: 'Not implemented'
        };
    }

    @Post('subscription/can-activate-pay')
    @JwtAuth()
    async canPayForSubscriptionManually(@Request() req) {
        return await this.service.activateSubscriptionPayLink(req.user);
    }

    @Get('test')
    @JwtAuth()
    async test(@Request() req) {
        return await this.service.testFn(req.user);
    }

    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    chargeForSubscriptions() {
        if (!this.isDevelopment) {
            this.logger.debug(`${new Date().toISOString()} Charging users for subscriptions.`);
            this.service.chargeUsersForSubscriptions();
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    retryChargeForSubscription() {
        if (!this.isDevelopment) {
            this.logger.debug(`${new Date().toISOString()} Retry charging users for subscriptions.`);
            this.service.retryFailedSubscriptionsCharge();
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_1PM)
    chargeForSavingPod() {
        if (!this.isDevelopment) {
            this.logger.debug(`${new Date().toISOString()} Charging members of pods.`);
            this.service.handleSavingPodCharges();
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async transferToAccount() {
        this.logger.debug(`${new Date().toISOString()} Transfer to members of pods.`);
        const res = await this.service.testFn();
        console.log(res);
    }
}
