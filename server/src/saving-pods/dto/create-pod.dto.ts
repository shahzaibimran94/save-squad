import { IsNotEmpty } from "class-validator";
import { Member } from "../interfaces/member.interface";

export class CreatePodDto {
    @IsNotEmpty()
    user: string;
    @IsNotEmpty()
    amount: string;
    members?: Member[];
}