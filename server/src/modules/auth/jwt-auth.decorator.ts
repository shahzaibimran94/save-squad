import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

export function JwtAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
