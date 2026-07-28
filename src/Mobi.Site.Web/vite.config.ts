import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        outDir: "wwwroot/build",
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, "Features/Shared/Styles/app.css"),
                simulador: resolve(__dirname, "Features/Home/Scripts/simulador.ts"),
            },
        },
    },
});
