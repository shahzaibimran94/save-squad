import { Get, Param } from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { Controller, Post, Request, Body, Put } from '@nestjs/common';
import { JwtAuth } from 'src/modules/auth/jwt-auth.decorator';
import { GenericResponse } from 'src/modules/shared/interfaces/common.interface';
import { SubscriptionInterceptor } from 'src/modules/subscriptions/subscription.interceptor';
import { CreatePodDto } from './dto/create-pod.dto';
import { MemberPod } from './interfaces/member.interface';
import { SavingPodsService } from './saving-pods.service';
import { SavingPodDocument } from './schemas/saving-pods.schema';
import { SavingPod as ISavingPod } from './interfaces/create-pod-response.interface';
import { UpdateSavingPodDto } from './dto/update-pod.dto';

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

    @Put(':podId')
    @JwtAuth()
    @UseInterceptors(SubscriptionInterceptor)
    async updatePod(
        @Request() req,
        @Param('podId') podId: string,
        @Body() body: UpdateSavingPodDto
    ): Promise<GenericResponse> {
        return await this.service.updatePod(req, podId, body);
    }

    @Post('join/:token')
    @JwtAuth()
    async acceptInvitation(@Param('token') token: string): Promise<GenericResponse> {
        return await this.service.joinSavingPod(token);
    }

}
