import { IsNotEmpty, IsOptional } from "class-validator";

export class AddCardDto {
    @IsNotEmpty()
    token: string;
    @IsOptional()
    default: boolean;
}