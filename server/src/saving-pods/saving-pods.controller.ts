import { Controller, Post, Request, Body } from '@nestjs/common';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { JwtAuth } from 'src/auth/jwt-auth.decorator';
import { CreatePodDto } from './dto/create-pod.dto';
import { SavingPodsService } from './saving-pods.service';

@Controller('saving-pods')
export class SavingPodsController {

    constructor(
        private readonly service: SavingPodsService
    ) {}

    @Post('')
    @JwtAuth()
    async createPod(@Request() req, @Body() body: CreatePodDto) {
        return await this.service.createPod((req.user as JwtValidateResponse), body);
    }

}
