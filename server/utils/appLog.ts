import { prisma } from "../db";

export function appLog(level: "error" | "warn" | "info", source: string, message: string): void {
	prisma.app_logs.create({ data: { level, source, message } }).catch(console.error);
}
