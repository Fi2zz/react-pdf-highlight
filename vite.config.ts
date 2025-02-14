import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import * as td from "typedoc";
async function viteDocPlugin() {
  let isBuild = false;

  return {
    name: "vite-plugin-docs",
    enforce: "post",
    config(config, { command }) {
      if (command == "build") {
        config.base = "/react-pdf-highlight/demo";
        config.build = config.build || {};
        config.build.outDir = "./docs/demo";
        config.build.emptyOutDir = true;
        isBuild = true;
      }
    },
    async buildStart() {
      const app = await td.Application.bootstrapWithPlugins({
        entryPoints: ["src/index.ts"],
        cleanOutputDir: true,
      });
      const project = await app.convert();
      if (project) await app.generateDocs(project, "docs");
    },
  } as Plugin;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteDocPlugin()],
  server: {
    port: 3003,
  },
});
