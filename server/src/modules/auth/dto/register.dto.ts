import { IsNotEmpty, MinLength, MaxLength, IsEmail } from 'class-validator';

export class RegisterDto {

    @IsNotEmpty({ message: 'Please provide a firstname' })
    @MaxLength(50, { message: 'Please provide a firstname with maximum 50 charactors' })
    firstName: string;

    @IsNotEmpty({ message: 'Please provide a lastname' })
    @MaxLength(50, { message: 'Please provide a lastname with maximum 50 charactors' })
    lastName: string;

    @IsNotEmpty({ message: 'Please provide a mobile number' })
    @MinLength(10, { message: 'Please provide a mobile number with minimum 10 digits' })
    @MaxLength(11, { message: 'Please provide a mobile number with maximum 11 digits' })
    mobile: string;

    @IsNotEmpty({ message: 'Please provide an email address' })
    @IsEmail()
    email: string;

    @IsNotEmpty({ message: 'Please provide a password' })
    @MinLength(8, { message: 'Please provide a password with minimum 8 charactors' })
    password: string;
}