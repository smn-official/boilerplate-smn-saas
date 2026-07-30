import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        outDir: "wwwroot/dist",
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, "Features/Shared/Styles/app.css"),
                uikit: resolve(__dirname, "Features/UiKit/Scripts/uikit.ts"),
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
