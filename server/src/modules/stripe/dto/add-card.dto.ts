import { IsNotEmpty } from "class-validator";

export class AddCardDto {
    @IsNotEmpty()
    token: string;
}