import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtValidateResponse } from 'src/auth/interfaces/jwt-validate-response.interface';
import { CreatePodDto } from './dto/create-pod.dto';
import { SavingPod, SavingPodDocument } from './schemas/saving-pods.schema';

@Injectable()
export class SavingPodsService {
    
    constructor(
        @InjectModel(SavingPod.name)
        private readonly savingPodModel: Model<SavingPod>
    ) {}

    async createPod(user: JwtValidateResponse, dto: CreatePodDto): Promise<SavingPodDocument> {
        return await this.savingPodModel.create(dto);
    }
}
