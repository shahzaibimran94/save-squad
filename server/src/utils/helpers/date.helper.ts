import { MonthDateRange } from "../interfaces/date.interface";

export function getMonthDateRange(): MonthDateRange {
    const now = new Date();

    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1), // First day,
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0), // Last day
    }
}