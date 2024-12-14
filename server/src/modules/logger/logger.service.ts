import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from './schemas/logger.schema';

@Injectable()
export class LoggingService {
  constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

  async logError(errorData: Record<string, any>): Promise<void> {
    try {
      const logEntry = new this.logModel({
        ...errorData,
        createdAt: new Date(),
      });
      await logEntry.save();
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }
}
