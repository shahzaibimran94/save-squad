import { IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {

    @IsNotEmpty({ message: 'Please provide a mobile number' })
    @MinLength(10, { message: 'Please provide a mobile number with minimum 10 digits' })
    @MaxLength(11, { message: 'Please provide a mobile number with maximum 11 digits' })
    mobile: string;
}