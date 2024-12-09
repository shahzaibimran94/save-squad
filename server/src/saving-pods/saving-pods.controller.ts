import { Get } from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { Controller, Post, Request, Body } from '@nestjs/common';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { SubscriptionInterceptor } from 'src/subscriptions/subscription.interceptor';
import { CreatePodDto } from './dto/create-pod.dto';
import { SavingPodsService } from './saving-pods.service';

@Controller('saving-pods')
export class SavingPodsController {

    constructor(
        private readonly service: SavingPodsService
    ) {}

    @Post('')
    @JwtAuth()
    @UseInterceptors(SubscriptionInterceptor)
    async createPod(@Request() req, @Body() body: CreatePodDto) {
        return await this.service.createPod(req, body);
    }

    @Get('')
    @JwtAuth()
    async getPods(@Request() req) {
        return await this.service.getUserActivePods(req);
    }

    @Get('member')
    @JwtAuth()
    async getMemberPods(@Request() req) {
        return await this.service.getMemberPods(req);
    }

}
