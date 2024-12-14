import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtValidateResponse } from './interfaces/jwt-validate-response.interface';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { data: string, iat: number, exp: number }): Promise<JwtValidateResponse> {
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.authService.findUserWithMobile(payload.data);

    return {
      id: user._id.toHexString(),
      name: user.fullName,
      ...user.info
    };
  }
}
