import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  constructor() {}

  getHello() {
    return 'Save Squard server running.....';
  }
}
