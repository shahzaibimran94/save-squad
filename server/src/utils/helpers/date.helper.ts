import { MonthDateRange, TimestampMonthDateRange } from "../interfaces/date.interface";

export function getMonthDateRange(): MonthDateRange {
    const now = new Date();

    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1), // First day,
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0), // Last day
    }
}

export function getTimestampMonthDateRange(): TimestampMonthDateRange {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); // Set to first day of month
    startOfMonth.setHours(0, 0, 0, 0); // Start of day

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of month
    endOfMonth.setHours(23, 59, 59, 999); // End of day

    return {
        start: Math.floor(startOfMonth.getTime() / 1000),
        end: Math.floor(endOfMonth.getTime() / 1000)
    }
}