import { randomBytes } from "node:crypto";
import multer from "multer";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Only raster image formats are accepted. SVG is intentionally excluded
 * because it can carry scripts and would be a stored-XSS vector.
 * The stored extension is derived from the MIME type, never from the
 * client-supplied filename, so a spoofed originalname cannot control it.
 */
const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/gif": ".gif",
	"image/avif": ".avif",
};

export const imageUpload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, cb) => {
			cb(null, "uploads/");
		},
		filename: (_req, file, cb) => {
			const ext = MIME_TO_EXT[file.mimetype] ?? ".jpg";
			const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString("hex")}`;
			cb(null, uniqueSuffix + ext);
		},
	}),
	limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
	fileFilter: (_req, file, cb) => {
		if (MIME_TO_EXT[file.mimetype]) {
			cb(null, true);
			return;
		}
		const err = new Error(
			"Only JPEG, PNG, WebP, GIF or AVIF images are allowed",
		) as Error & { status?: number };
		err.status = 400;
		cb(err);
	},
});
