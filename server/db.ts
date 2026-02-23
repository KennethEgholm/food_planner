import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Optional: disconnect on exit
process.on("SIGINT", async () => {
	await prisma.$disconnect();
	process.exit(0);
});
