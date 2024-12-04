import { Body, Controller, Post, Request, Get } from '@nestjs/common';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {

    constructor(private readonly service: SubscriptionsService) {}

    @Get('')
    @JwtAuth()
    async getUserSubscription(@Request() req) {
        return await this.service.getUserSubscription(req.user);
    }

    @Post('')
    @JwtAuth()
    async createSubscription(@Request() req, @Body('id') id) {
        await this.service.saveUserSubscription(req.user, id);
        return {
            valid: true
        };
    }
}
