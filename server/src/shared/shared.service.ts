import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/auth/schemas/user.schema';

@Injectable()
export class SharedService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
    ) {}

    async getUserByMobile(mobile: string): Promise<UserDocument> {
        return await this.userModel.findOne({ mobile });
    }
}