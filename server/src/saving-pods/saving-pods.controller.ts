import { Get, Param } from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { Controller, Post, Request, Body } from '@nestjs/common';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { GenericResponse } from 'src/shared/interfaces/common.interface';
import { SubscriptionInterceptor } from 'src/subscriptions/subscription.interceptor';
import { CreatePodDto } from './dto/create-pod.dto';
import { MemberPod } from './interfaces/member.interface';
import { SavingPodsService } from './saving-pods.service';
import { SavingPodDocument } from './schemas/saving-pods.schema';
import { SavingPod as ISavingPod } from './interfaces/create-pod-response.interface';

@Controller('saving-pods')
export class SavingPodsController {

    constructor(
        private readonly service: SavingPodsService
    ) {}

    @Post('')
    @JwtAuth()
    @UseInterceptors(SubscriptionInterceptor)
    async createPod(@Request() req, @Body() body: CreatePodDto): Promise<ISavingPod> {
        return await this.service.createPod(req, body);
    }

    @Get('')
    @JwtAuth()
    async getPods(@Request() req): Promise<SavingPodDocument[]> {
        return await this.service.getUserActivePods(req);
    }

    @Get('member')
    @JwtAuth()
    async getMemberPods(@Request() req): Promise<MemberPod[]> {
        return await this.service.getMemberPods(req);
    }

    @Post('join/:token')
    async acceptInvitation(@Param('token') token: string): Promise<GenericResponse> {
        return await this.service.joinSavingPod(token);
    }

}
