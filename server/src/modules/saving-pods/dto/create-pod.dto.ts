import { IsNotEmpty } from "class-validator";
import { Member } from "../interfaces/member.interface";

export class CreatePodDto {
    @IsNotEmpty()
    amount: string;
    members?: Member[];
    startDate?: Date;
}