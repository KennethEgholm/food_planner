/** Normalizes form/JSON values that may arrive as boolean, "true"/"1", or 1/0. */
export function parseBoolean(value: unknown): boolean {
	return value === true || value === "true" || value === 1 || value === "1";
}

/** Prisma "record not found" (e.g. update/delete of a missing row). */
export function isPrismaNotFound(err: unknown): boolean {
	return typeof err === "object" && err !== null && (err as any).code === "P2025";
}

/** Prisma foreign key violation (e.g. referencing a missing meal/ingredient). */
export function isPrismaForeignKeyError(err: unknown): boolean {
	return typeof err === "object" && err !== null && (err as any).code === "P2003";
}
