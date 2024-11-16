export class ForgotPasswordDto {
    email: string;
}

export class ForgotPasswordResponseDto {
    token: string;
}

export class ResetPasswordDto {
    token: string;
    newPassword: string;
}

export class ResetPasswordResponseDto {
    success: boolean;
}