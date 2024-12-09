import { Member } from "./member.interface";

export interface SavingPod {
    id: string;
    user: string;
    name?: string;
    amount: number;
    members: Member[];
}