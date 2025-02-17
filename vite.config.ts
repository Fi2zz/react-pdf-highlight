import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";

import * as td from "typedoc";

async function generateDocs() {
  const app = await td.Application.bootstrapWithPlugins({
    entryPoints: ["src/index.ts", "src/types.ts", "src/components/*.tsx"],
    cleanOutputDir: true,
    tsconfig: "./tsconfig.npm.json",
  });
  const project = await app.convert();
  if (project) await app.generateDocs(project, "docs");
}

// genx/erateDocs();
function viteDocPlugin() {
  let isBuild = false;
  return {
    name: "vite-plugin-docs",
    enforce: "post",
    config(config, { command }) {
      if (command == "build") {
        config.base = "/react-pdf-highlight";
        config.build = config.build || {};
        config.build.outDir = "./docs";
        config.build.assetsDir = "assets/demo";
        config.build.emptyOutDir = false;
        isBuild = true;
      }
    },
    async buildStart() {
      if (isBuild) generateDocs();
    },
    generateBundle(_, bundle) {
      if (isBuild) bundle["index.html"].fileName = "demo.html";
    },
  } as Plugin;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteDocPlugin()],
  server: { port: 3000 },
});
