import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { UserDocument } from 'src/auth/schemas/user.schema';
import { SharedService } from 'src/shared/shared.service';
import Stripe from 'stripe';
import { BankInfo, CardInfo, PaymentMethodsInfo } from './interfaces/payment-methods-info.interface';
import { VerificationSessionResponse } from './interfaces/verification-session.interface';
import { StripeInfo, StripeInfoDocument } from './schemas/stripe-info.schema';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(
        @InjectModel(StripeInfo.name)
        private readonly stripeInfoModel: Model<StripeInfo>,
        private readonly configSrvc: ConfigService,
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

    async getPaymentInfo(user: JwtValidateResponse): Promise<PaymentMethodsInfo> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const { customerId, accountId } = stripeInfoInstance;

        let defaultPaymentMethod: string;
        const customer = await this.getCustomer(customerId) as Stripe.Customer;
        if (customer && customer.invoice_settings && customer.invoice_settings.default_payment_method) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method as string;
        }

        const cards = await this.getCustomerPaymentMethods(customerId);
        const customerCards: CardInfo[] = this.getCardDetails(cards, defaultPaymentMethod);

        const banks = await this.getCustomerBank(accountId);
        const customerBanks: BankInfo[] = this.getBankDetails(banks);

        return { 
            cards: customerCards, 
            banks: customerBanks 
        };
    }

    getCardDetails(cards: Stripe.ApiList<Stripe.PaymentMethod>, defaultPaymentMethod?: string): CardInfo[] {
        const customerCards: CardInfo[] = [];

        for (const card of cards.data) {
            if (card.type === 'card') {
                const cardData = card.card;
                const { brand, exp_month, exp_year, funding, last4, three_d_secure_usage: { supported } } = cardData;

                const cardInfo = {
                    id: card.id,
                    brand,
                    exp_month,
                    exp_year,
                    funding,
                    last4,
                    three_d_secure_supported: supported,
                    default: defaultPaymentMethod && typeof defaultPaymentMethod === 'string' && card.id === defaultPaymentMethod
                } as CardInfo;

                customerCards.push(cardInfo);
            }
        }

        return customerCards;
    }

    getBankDetails(banks: Stripe.ApiList<Stripe.ExternalAccount>): BankInfo[] {
        const customerBanks: BankInfo[] = [];

        for (const bank of banks.data) {
            if (bank.object === 'bank_account') {
                const { id, last4, routing_number, account_holder_name, default_for_currency } = bank;
                
                customerBanks.push({
                    id,
                    last4,
                    sort_code: routing_number,
                    account_holder_name,
                    default: default_for_currency
                });
            }
        }

        return customerBanks;
    }

    async createAccount(user: UserDocument, ip: string): Promise<boolean> {
        const customer: Stripe.Customer = await this.createCustomer(user);
        const account: Stripe.Account = await this.createConnectAccount(user, ip);

        await this.stripeInfoModel.create({
            user: user._id,
            customerId: customer.id,
            accountId: account.id
        });

        return true;
    }

    async createCustomer(user: UserDocument): Promise<Stripe.Customer> {
        return await this.stripe.customers.create({
            name: user.fullName,
            email: user.email,
            phone: user.mobile,
            address: {
                line1: user.addressLine1,
                line2: user.addressLine2,
                city: user.city,
                country: user.country,
                postal_code: user.postCode 
            }
        });
    }

    async createConnectAccount(user: UserDocument, ip: string): Promise<Stripe.Account> {
        const date = new Date(user.dob);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        return await this.stripe.accounts.create({
            country: user.country,
            email: user.email,
            business_type: 'individual',
            business_profile: {
              mcc: '7372',
              url: 'https://smr3.co.uk',
            },
            metadata: {
                user_id: user._id.toHexString()
            },
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true },
            },
            tos_acceptance: {
              date: Math.floor(Date.now() / 1000), // Current time in seconds
              ip: ip, // Replace with the user's actual IP address
            },
            controller: {
              fees: {
                payer: 'application',
              },
              losses: {
                payments: 'application',
              },
              requirement_collection: 'application',
              stripe_dashboard: {
                type: 'none',
              },
            },
            individual: {
              first_name: user.firstName,
              last_name: user.lastName,
              phone: user.mobile,
              gender: user.gender,
              address: {
                city: user.city,
                line1: user.addressLine1,
                postal_code: user.postCode,
              },
              dob: {
                day: day,
                month: month,
                year: year,
              },
              email: user.email,
            }, 
        });
    }

    /**
     * 
     * Stripe customer payment method and connect account external account will be checked
     * 
     * @param userId 
     * @returns 
     */
    async userHasPaymentMethods(userId: string): Promise<boolean> {
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

    async addCardPaymentMethod(user: JwtValidateResponse, token: string): Promise<boolean> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const { customerId } = stripeInfoInstance;

        await this.attachPaymentMethodToCustomer(token, customerId);

        return true;
    }

    async addBank(user: JwtValidateResponse, token: string): Promise<boolean> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const { accountId } = stripeInfoInstance;

        await this.addExternalAccount(accountId, token);

        return true;
    }

    async createVerificationSession(user: JwtValidateResponse): Promise<VerificationSessionResponse> {
        const verificationSession: Stripe.Response<Stripe.Identity.VerificationSession> = await this.stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
                user_id: user.id
            },
            options: {
                document: {
                    allowed_types: ['driving_license', 'id_card', 'passport'],
                    require_id_number: true,
                    require_live_capture: true,
                    require_matching_selfie: true
                }
            }
        });

        return {
            client_secret: verificationSession.client_secret
        };
    }

    async getCustomerPaymentMethods(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
        return await this.stripe.customers.listPaymentMethods(customerId, { limit: 3 });
    }

    async getCustomerBank(accountId: string): Promise<Stripe.ApiList<Stripe.ExternalAccount>> {
        return await this.stripe.accounts.listExternalAccounts(accountId, {
            object: 'bank_account'
        });
    }

    async getCustomer(customerId: string): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
        return await this.stripe.customers.retrieve(customerId);
    }
    async getAccount(accountId: string): Promise<Stripe.Account> {
        return await this.stripe.accounts.retrieve(accountId);
    }

    async createPaymentMethod(token: string): Promise<string> {
        const paymentMethod: Stripe.PaymentMethod = await this.stripe.paymentMethods.create({
            type: 'card',
            card: {
                token,
            },
        });

        return paymentMethod.id;      
    }

    async attachPaymentMethodToCustomer(token: string, customerId: string): Promise<void> {
        const paymentMethodId = await this.createPaymentMethod(token);

        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
    }

    async addExternalAccount(accountId: string, token: string) {
        await this.stripe.accounts.createExternalAccount(
            accountId,
            {
                external_account: token,
            },
        );
    }

    async updateExternalAccount(accountId: string, token: string) {
        await this.stripe.accounts.update(
            accountId,
            {
                external_account: token,
            }
        );
    }

    async isUserVerified(userId: string): Promise<boolean> {
        let verified = false;
        
        const stripeInfoInstance: StripeInfo = await this.stripeInfoModel.findOne({ user: userId });
        if (stripeInfoInstance) {
            const { accountId } = stripeInfoInstance;

            verified = await this.accountVerified(accountId);
        }

        return verified;
    }

    private async accountVerified(accountId: string): Promise<boolean> {
        const account: Stripe.Account = await this.stripe.accounts.retrieve(accountId);
        
        return account.individual.verification.status === 'verified';
    }
}
