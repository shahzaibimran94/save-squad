import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserInfo } from 'os';
import Stripe from 'stripe';
import { StripeInfo, StripeInfoDocument } from './schemas/stripe-info.schema';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(
        @InjectModel(StripeInfo.name)
        private readonly stripeInfoModel: Model<StripeInfo>,
        private readonly configSrvc: ConfigService  
    ) {
        const stripeSecretKey = this.configSrvc.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new BadRequestException('Stripe secret key not configured');
        }

        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-11-20.acacia',
        });
    }

    async getStripeInfo(userId: string): Promise<StripeInfoDocument> {
        return await this.stripeInfoModel.findOne({ user: userId });
    }

    async userHasPaymentMethods(userId: string) {
        let hasCard = false;
        let hasPayout = false;

        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(userId);
        if (stripeInfoInstance) {
            const { customerId, accountId } = stripeInfoInstance;
            
            const customerPaymentMethods: Stripe.ApiList<Stripe.PaymentMethod> = await this.getCustomerPaymentMethods(customerId);
            if (customerPaymentMethods.data.length) {
                hasCard = true;
            }

            const account: Stripe.Account = await this.getAccount(accountId);
            console.log(account);
        }

        return hasCard && hasPayout;
    }

    async getCustomerPaymentMethods(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
        return await this.stripe.customers.listPaymentMethods(customerId);
    }

    async getAccount(accountId: string): Promise<Stripe.Account> {
        return await this.stripe.accounts.retrieve(accountId);
    }
}
