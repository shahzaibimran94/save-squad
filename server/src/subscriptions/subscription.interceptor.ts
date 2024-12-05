import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionInterceptor implements NestInterceptor {
    constructor(
        private readonly subscriptionService: SubscriptionsService
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();

        // Fetch subscription data and attach it to the request
        const user = request.user;
        if (user) {
            const subscription = await this.subscriptionService.getUserSubscription(user);
            request.subscription = subscription; // Attach the subscription to the request
        }

        return next.handle(); // Proceed to the next handler
    }
}
