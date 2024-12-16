import { Member } from "../interfaces/member.interface";

export class UpdateSavingPodDto {
    amount?: number;
    startDate?: Date;
    members?: string[];
    // expired?: boolean;
}