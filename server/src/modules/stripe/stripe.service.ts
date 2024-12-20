import { ForbiddenException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { JwtValidateResponse } from 'src/modules/auth/interfaces/jwt-validate-response.interface';
import { UserDocument } from 'src/modules/auth/schemas/user.schema';
import { SharedService } from 'src/modules/shared/shared.service';
import { IUserSubscription, UserSubscriptionFees } from 'src/modules/subscriptions/interfaces/user-subscription.interface';
import { NO_CARD_AVAILABLE, NO_DEFAULT_CARD_AVAILABLE, PAYMENT_FAILED, PAYMENT_SUCCESS } from 'src/utils/constants/common';
import { PaymentSubmitType } from 'src/utils/enums/payment-submit-type.enum';
import { PaymentType } from 'src/utils/enums/payment-type.enum';
import { getMonthDateRange, getTimestampMonthDateRange } from 'src/utils/helpers/date.helper';
import Stripe from 'stripe';
import { SavingPodToCharge } from '../saving-pods/interfaces/get-saving-pod.interface';
import { SavingPodsService } from '../saving-pods/saving-pods.service';
import { AddCardDto } from './dto/add-card.dto';
import { ChargeCustomerDto } from './dto/charge-customer.dto';
import { ChargeCustomer } from './interfaces/charge-customer.interface';
import { BankInfo, CardInfo, PaymentMethodsInfo } from './interfaces/payment-methods-info.interface';
import { TransactionResponse } from './interfaces/transaction.interface';
import { VerificationSessionResponse } from './interfaces/verification-session.interface';
import { RetryTransaction } from './schemas/retry-transaction.schema';
import { PaymentStatus } from './schemas/saving-pod-member-transactions.schema';
import { StripeInfo, StripeInfoDocument } from './schemas/stripe-info.schema';
import { SubscriptionTransaction } from './schemas/user-subscription-transaction.schema';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(
        @InjectModel(StripeInfo.name)
        private readonly stripeInfoModel: Model<StripeInfo>,
        @InjectModel(SubscriptionTransaction.name)
        private readonly subscriptionTransactionModel: Model<SubscriptionTransaction>,
        @InjectModel(RetryTransaction.name)
        private readonly retryChargeSubscriptionModel: Model<RetryTransaction>,
        private readonly configSrvc: ConfigService,
        private readonly sharedSrvc: SharedService,
        private readonly savingPodSrvc: SavingPodsService
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

    async getPaymentInfo(user: JwtValidateResponse | string, skipBank = false): Promise<PaymentMethodsInfo> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(typeof user === 'string' ? user : user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const response = {} as PaymentMethodsInfo;

        const { customerId, accountId } = stripeInfoInstance;

        let defaultPaymentMethod: string;
        const customer: Stripe.Customer = await this.getCustomer(customerId);
        if (customer && customer.invoice_settings && customer.invoice_settings.default_payment_method) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method as string;
        }

        const cards = await this.getCustomerPaymentMethods(customerId);
        const customerCards: CardInfo[] = this.getCardDetails(cards, defaultPaymentMethod);
        response['cards'] = customerCards;

        if (!skipBank) {
            const banks = await this.getCustomerBank(accountId);
            const customerBanks: BankInfo[] = this.getBankDetails(banks);
            response['banks'] = customerBanks;
        }

        return response;
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
                    customer: card.customer,
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
                const { id, last4, routing_number, account_holder_name, default_for_currency, account } = bank;
                
                customerBanks.push({
                    id,
                    last4,
                    sort_code: routing_number,
                    account_holder_name,
                    default: default_for_currency,
                    account: account as string
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

    async addCardPaymentMethod(user: JwtValidateResponse, payload: AddCardDto): Promise<boolean> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const { customerId } = stripeInfoInstance;

        await this.attachPaymentMethodToCustomer(payload, customerId);

        return true;
    }

    async addBank(user: JwtValidateResponse, payload: AddCardDto): Promise<boolean> {
        const stripeInfoInstance: StripeInfo = await this.getStripeInfo(user.id);
        if (!stripeInfoInstance) {
            throw new BadRequestException();
        }

        const { accountId } = stripeInfoInstance;

        await this.addExternalAccount(accountId, payload);

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

    async getCustomer(customerId: string): Promise<Stripe.Customer> {
        const customer = await this.stripe.customers.retrieve(customerId);

        if (customer.deleted) {
            throw new ForbiddenException();
        }

        return customer as Stripe.Customer;
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

    async attachPaymentMethodToCustomer(payload: AddCardDto, customerId: string): Promise<void> {
        const paymentMethodId = await this.createPaymentMethod(payload.token);

        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        if (payload.default) {
            await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });
        }
    }

    async addExternalAccount(accountId: string, payload: AddCardDto) {
        const data = {
            external_account: payload.token,
        };

        if (payload.default) {
            data['default_for_currency'] = payload.default;
        }

        await this.stripe.accounts.createExternalAccount(
            accountId,
            data
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

    async chargeUsersForSubscriptions() {
        const subscribedUsers: UserSubscriptionFees[] = await this.getNotPaidSubscriptions();

        if (subscribedUsers.length) {
            const skipBankDetails = true;
            const customersPaymentMethods = await Promise.allSettled(subscribedUsers.map(instance => this.getPaymentInfo(instance.user.toHexString(), skipBankDetails)));
        
            const transactionsResponse: TransactionResponse[] = [];
            let index = 0;
            for (const response of customersPaymentMethods) {
                const subscribedUser = subscribedUsers[index];
                if (response.status === 'fulfilled') {
                    const cards = response.value.cards;
                    if (cards.length) {
                        // check if default card available else pick the first one
                        let defaultCard = cards.find(card => card.default);
                        if (!defaultCard) {
                            defaultCard = cards[0];
                        }
                        
                        if (defaultCard) {
                            const { subscription: { fee } } = subscribedUser;
                            try {
                                const paymentIntent: Stripe.PaymentIntent = await this.chargeCustomer({
                                    fee,
                                    currency: 'gbp',
                                    customerId: defaultCard.customer,
                                    paymentMethod: defaultCard.id,
                                });

                                transactionsResponse.push({
                                    user: subscribedUser.user.toHexString(),
                                    subscription: subscribedUser.subscription._id.toHexString(),
                                    paymentStatus: PaymentStatus.PAID,
                                    paymentResponse: JSON.stringify({
                                        chargeId: paymentIntent.latest_charge,
                                        status: paymentIntent.status,
                                        raw: JSON.stringify(paymentIntent)
                                    })
                                });
                            } catch (e) {
                                transactionsResponse.push({
                                    user: subscribedUser.user.toHexString(),
                                    subscription: subscribedUser.subscription._id.toHexString(),
                                    paymentStatus: PaymentStatus.FAILED,
                                    paymentResponse: JSON.stringify(e)
                                });
                            }
                        } else {
                            transactionsResponse.push({
                                user: subscribedUser.user.toHexString(),
                                subscription: subscribedUser.subscription._id.toHexString(),
                                paymentStatus: PaymentStatus.FAILED,
                                paymentResponse: NO_DEFAULT_CARD_AVAILABLE
                            });
                        }
                    } else {
                        transactionsResponse.push({
                            user: subscribedUser.user.toHexString(),
                            subscription: subscribedUser.subscription._id.toHexString(),
                            paymentStatus: PaymentStatus.FAILED,
                            paymentResponse: NO_CARD_AVAILABLE
                        });
                    }
                } else {
                    transactionsResponse.push({
                        user: subscribedUser.user.toHexString(),
                        subscription: subscribedUser.subscription._id.toHexString(),
                        paymentStatus: PaymentStatus.FAILED,
                        paymentResponse: JSON.stringify(response.reason)
                    });
                }
                index = index + 1;
            }

            if (transactionsResponse.length) {
                const transactions = await this.subscriptionTransactionModel.insertMany(transactionsResponse);
                
                // create retry instance for failed payments
                const failedTransactions: { transactionId: string }[] = transactions.filter(
                    transaction => transaction.paymentStatus === PaymentStatus.FAILED
                ).map(transaction => ({
                    transactionId: transaction._id.toHexString(),
                }));
                
                await this.retryChargeSubscriptionModel.insertMany(failedTransactions);
            }
        }
    }

    async chargeCustomer(payload: ChargeCustomerDto): Promise<Stripe.PaymentIntent> {
        return await this.stripe.paymentIntents.create({
            amount: payload.fee * 100, // Amount in the smallest currency unit (e.g., pence)
            currency: payload.currency,
            customer: payload.customerId,
            payment_method: payload.paymentMethod,
            off_session: true, // Charge without user intervention
            confirm: true, // Automatically confirm the payment intent
            metadata: {
                tag: PaymentType.SUBSCRIPTION
            }
        });
    }

    async chargeCustomerV2(userId: string, amount: number): Promise<ChargeCustomer> {
        const skipBankDetails = true;
        const userPaymentMethods = await this.getPaymentInfo(userId, skipBankDetails);

        const cards = userPaymentMethods.cards;
        if (cards.length) {
            // check if default card available else pick the first one
            let defaultCard = cards.find(card => card.default);
            if (!defaultCard) {
                defaultCard = cards[0];
            }
            
            if (defaultCard) {
                try {
                    const paymentIntent: Stripe.PaymentIntent = await this.stripe.paymentIntents.create({
                        amount: amount * 100, // Amount in the smallest currency unit (e.g., pence)
                        currency: 'gbp',
                        customer: defaultCard.customer,
                        payment_method: defaultCard.id,
                        off_session: true, // Charge without user intervention
                        confirm: true, // Automatically confirm the payment intent
                        metadata: {
                            tag: PaymentType.SUBSCRIPTION
                        }
                    });

                    return {
                        error: false,
                        response: JSON.stringify({
                            chargeId: paymentIntent.latest_charge,
                            status: paymentIntent.status,
                            raw: JSON.stringify(paymentIntent)
                        })
                    };
                } catch (e) {
                    return {
                        error: true,
                        response: JSON.stringify(e)
                    };
                }
            } else {
                return {
                    error: true,
                    response: NO_DEFAULT_CARD_AVAILABLE
                };
            }
        } else {
            return {
                error: true,
                response: NO_CARD_AVAILABLE
            };
        }
    }

    async retryFailedSubscriptionsCharge() {
        const { start, end } = getMonthDateRange();
        
        const retryInstances = await this.retryChargeSubscriptionModel.find({
            active: true,    
            retryCount: { $lt: 3 },
            createdAt: { $gte: start, $lte: end },
        })
        .populate({
            path: 'transactionId',
            select: 'user subscription',
            populate: {
                path: 'subscription',
                model: 'Subscription',
                select: 'fee'
            }
        })
        .select('transactionId retryCount notes');

        for (const instance of retryInstances) {
            instance.retryCount = instance.retryCount + 1;
            const paymentMethods = await this.getPaymentInfo((instance.transactionId.user as any).toHexString(), true);
            if (paymentMethods.cards.length) {
                const cards = paymentMethods.cards;
                let defaultCard = cards.find(card => card.default);
                if (!defaultCard) {
                    defaultCard = cards[0];
                }

                if (defaultCard) {
                    const paymentIntent: Stripe.PaymentIntent = await this.chargeCustomer({
                        fee: instance.transactionId.subscription.fee,
                        currency: 'gbp',
                        customerId: defaultCard.customer,
                        paymentMethod: defaultCard.id,
                    });
                    
                    const note = JSON.stringify({
                        chargeId: paymentIntent.latest_charge,
                        status: paymentIntent.status,
                        raw: JSON.stringify(paymentIntent)
                    });
                    if (instance.notes) {
                        const notes = JSON.parse(instance.notes);
                        instance.notes = JSON.stringify([note, ...notes]);
                    } else {
                        instance.notes = JSON.stringify([note]);
                    }

                    instance.active = false;

                    await instance.save();
                    await this.subscriptionTransactionModel.findByIdAndUpdate(instance.transactionId['_id'], {
                        paymentStatus: PaymentStatus.PAID,
                        paymentResponse: note
                    });
                } else {
                    const note = JSON.stringify({
                        status: PaymentStatus.FAILED,
                        raw: NO_DEFAULT_CARD_AVAILABLE
                    });
                    if (!instance.notes) {
                        const notes = JSON.parse(instance.notes);
                        instance.notes = JSON.stringify([note, ...notes]);
                    } else {
                        instance.notes = JSON.stringify([note]);
                    }
                    await instance.save();
                }
            } else {
                const note = JSON.stringify({
                    status: PaymentStatus.FAILED,
                    raw: NO_CARD_AVAILABLE
                });
                if (!instance.notes) {
                    const notes = JSON.parse(instance.notes);
                    instance.notes = JSON.stringify([note, ...notes]);
                } else {
                    instance.notes = JSON.stringify([note]);
                }
                await instance.save();
            }
        }
    }

    // TODOS Have to make sure if we are getting after 3 days than entry should be made for current month not for the next month
    async payManually(user: JwtValidateResponse) {
        const subscription: IUserSubscription = await this.sharedSrvc.getUserSubscription(user);
        
        if (!subscription.fee) {
            throw new ForbiddenException();
        }
        
        const hasPaid = await this.hasUserPaid(user.id); // user has paid for current month
        if (hasPaid) {
            throw new ForbiddenException();
        }

        const { error, response }: ChargeCustomer = await this.chargeCustomerV2(user.id, subscription.fee);

        await this.subscriptionTransactionModel.create({
            user: user.id,
            subscription: subscription.id,
            paymentStatus: error ? PaymentStatus.FAILED : PaymentStatus.PAID,
            paymentResponse: response,
            paymentSubmitted: PaymentSubmitType.MANUAL
        });
        
        return {
            message: error ? PAYMENT_FAILED : PAYMENT_SUCCESS
        };
    }

    async hasUserPaid(userId: string): Promise<boolean> {
        const { start, end } = getMonthDateRange();

        return !!(await this.subscriptionTransactionModel.findOne({
            user: userId,
            paymentStatus: PaymentStatus.PAID,
            createdAt: { $gte: start, $lte: end },
        }));
    }

    /**
     * 
     * @param userId {string}
     * 
     * Search stripe charges for current month for provided customer using metadata 
     * 
     * @returns {Stripe.Charge}
     */
    async getCustomerSubscriptionCharge(userId: string): Promise<Stripe.Charge[]> {
        const { customerId } = await this.getStripeInfo(userId);
        const { start, end } = getTimestampMonthDateRange();

        const charges: Stripe.ApiList<Stripe.Charge> = await this.stripe.charges.list({
            customer: customerId,
            created: { gte: start, lte: end },
            limit: 100
        });

        return charges.data.filter((charge: Stripe.Charge) => charge.metadata.tag === PaymentType.SUBSCRIPTION);
    }

    /**
     * 
     * @param user {JwtValidateResponse}
     * 
     * A manual pay button will be enabled on client side 
     * if from (subscription activation day + 3 days) payment has been received for subscription
     * on 4th day after activation day, button will be enabled on client side
     * 
     * @returns {boolean}
     */
    async activateSubscriptionPayLink(user: JwtValidateResponse): Promise<boolean> {
        const userSubscription = await this.sharedSrvc.getUserSubscription(user);
        
        const today = new Date();
        if (userSubscription.activationDay + 3 < today.getDate()) {
            const customerCurrMonthSubscriptionCharges = await this.getCustomerSubscriptionCharge(user.id);
            return customerCurrMonthSubscriptionCharges.length === 0;
        }

        return false;
    }

    async handleSavingPodCharges() {
        const savingPods: SavingPodToCharge[] = await this.savingPodSrvc.getSavingPodsToCharge();

        if (savingPods.length) {
            console.log(JSON.stringify(savingPods, null, 2));
            // saving pod member transactions for user id to find out non paid members
            // have to group data like
            // saving pod => member => pending
        } 
    }

    private async getNotPaidSubscriptions(): Promise<UserSubscriptionFees[]> {
        const allSubscribedUsers: UserSubscriptionFees[] = await this.sharedSrvc.getUserSubscriptions();

        if (allSubscribedUsers.length) {
            const usersAlreadyPaid = await this.subscriptionTransactionModel.find({
                user: {
                    $in: allSubscribedUsers.map(instance => instance.user)
                },
                paymentStatus: PaymentStatus.PAID,
                $expr: {
                    $eq: [
                        { $dayOfMonth: "$createdAt" },
                        { $dayOfMonth: new Date() }
                    ]
                } 
            }).select('user');

            const usersAlreadyPaidObject = usersAlreadyPaid.reduce((obj: { [key: string]: ObjectId }, data) => {
                return {
                    ...obj,
                    [data.user as unknown as string]: data.user
                }
            }, {});

            // This will be getting users who hasn't paid for current month
            if (Object.keys(usersAlreadyPaidObject).length > 0) {
                return allSubscribedUsers.filter(instance => !usersAlreadyPaidObject[instance.user.toHexString()])
            }
        }

        return allSubscribedUsers;
    }

    private async accountVerified(accountId: string): Promise<boolean> {
        const account: Stripe.Account = await this.stripe.accounts.retrieve(accountId);
        
        return account.individual.verification.status === 'verified';
    }

    async testFn(user: JwtValidateResponse) {
        return { message: 'testing' };
    }
}
