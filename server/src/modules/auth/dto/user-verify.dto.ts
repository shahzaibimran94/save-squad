export class UserVerifyDto {
    phoneCode: string;
    emailCode: string;
}

export class ContactVerified {
    phone: boolean;
    email: boolean;
}