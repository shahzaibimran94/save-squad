import { IsNotEmpty, IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
    @IsNotEmpty({ message: 'Please provide an email address' })
    @IsEmail()
    email: string;
}

export class ForgotPasswordResponseDto {
    token: string;
}

export class ResetPasswordDto {
    @IsString()
    token: string;
    @IsString()
    newPassword: string;
}

export class ResetPasswordResponseDto {
    success: boolean;
}