import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

// Derive display-size copies from the existing logos; keep all original PNGs.
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  for (const name of ["doan", "hoi", "ctut", "bookclub"]) {
    const original = await readFile(`public/logos/logo-${name}.png`);
    const data = await page.evaluate(async (base64) => {
      const img = new globalThis.Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const scale = 192 / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", 0.92).split(",")[1];
    }, original.toString("base64"));
    const result = Buffer.from(data, "base64");
    await writeFile(`public/logos/logo-${name}-192.webp`, result);
    console.log(`${name}: ${original.length} -> ${result.length} bytes`);
  }
} finally {
  await browser.close();
}
