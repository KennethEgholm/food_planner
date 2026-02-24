import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	// In production, we don't need a specific VITE_API_URL if we proxy everything via nginx to /api
	// However, if we do need it, it must be available at build time.
	// For this setup, we will rely on the relative path /api to go through Nginx.
	return {
		plugins: [react()],
		server: {
			host: true,
			strictPort: true,
			port: 5173,
			proxy: {
				"/api": {
					target: env.VITE_API_URL || "http://localhost:5001",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
				"/uploads": {
					target: env.VITE_API_URL || "http://localhost:5001",
					changeOrigin: true,
				},
			},
		},
	};
});
