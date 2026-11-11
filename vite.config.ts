import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const invitationWarmup: Plugin = {
  name: "invitation-warmup",
  transformIndexHtml: {
    order: "post",
    handler(_html, context) {
      const entry = Object.values(context.bundle ?? {}).find(
        (item) => item.type === "chunk" && item.name === "preloadInvitation",
      );
      return [{
        tag: "script",
        attrs: {
          type: "module", async: true, crossorigin: true,
          src: entry ? `/bookclub/${entry.fileName}` : "/bookclub/src/preloadInvitation.ts",
        },
        injectTo: "head",
      }];
    },
  },
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/bookclub/",
  plugins: [react(), tailwindcss(), invitationWarmup],
  // Manual QA builds must use the same isolated backend as Playwright.
  define:
    mode === "e2e"
      ? {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
            "https://bookclub-test.invalid",
          ),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
            "test-only-public-key",
          ),
          "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(""),
        }
      : undefined,
  build: {
    outDir: mode === "e2e" ? "dist-e2e" : "dist",
    rolldownOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        preloadInvitation: fileURLToPath(new URL("./src/preloadInvitation.ts", import.meta.url)),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
}));
