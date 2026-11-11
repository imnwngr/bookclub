import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { designBackend } from "../tests/e2e/redesign-fixtures.ts";

const output = process.argv[2] ?? ".local/ui-redesign/brand-scroll-v3/video";
const origin = process.env.REVIEW_ORIGIN || "http://127.0.0.1:4173";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    await designBackend(context);
    await context.route("**/*", (route) =>
      ["127.0.0.1", "bookclub-test.invalid"].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.fallback()
        : route.abort(),
    );
    const page = await context.newPage();
    await page.goto(
      `${origin}/bookclub/?__spa=%2Fbookclub%2Fdesign-fixture%2Fminh-an`,
    );
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await page.locator(".opening-paper").waitFor({ state: "detached" });
    const recorder = await browser.newPage();
    await recorder.evaluate(
      ({ width }) => {
        const canvas = globalThis.document.createElement("canvas");
        canvas.width = width;
        canvas.height = 900;
        const ctx = canvas.getContext("2d");
        const stream = canvas.captureStream(30);
        const media = new globalThis.MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 3500000,
        });
        const chunks = [];
        media.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        globalThis.drawFrame = async (base64) => {
          const img = new globalThis.Image();
          img.src = "data:image/jpeg;base64," + base64;
          await img.decode();
          ctx.drawImage(img, 0, 0, width, 900);
        };
        globalThis.finishVideo = () =>
          new Promise((resolve) => {
            media.onstop = async () => {
              const bytes = new Uint8Array(
                await new globalThis.Blob(chunks, {
                  type: "video/webm",
                }).arrayBuffer(),
              );
              let binary = "";
              for (const byte of bytes) binary += String.fromCharCode(byte);
              stream.getTracks().forEach((track) => track.stop());
              resolve(globalThis.btoa(binary));
            };
            media.stop();
          });
        media.start();
      },
      { width },
    );
    const cdp = await context.newCDPSession(page);
    // Keep the invitation composited while the other tab encodes the frames.
    await page.bringToFront();
    let frames = 0,
      pending = Promise.resolve();
    cdp.on("Page.screencastFrame", (event) => {
      frames++;
      pending = pending.then(() =>
        recorder.evaluate((data) => globalThis.drawFrame(data), event.data),
      );
      void cdp
        .send("Page.screencastFrameAck", { sessionId: event.sessionId })
        .catch(() => {});
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 85,
      maxWidth: width,
      maxHeight: 900,
      everyNthFrame: 2,
    });
    for (const [name, offset] of [
      ["event", 0.15],
      ["event", 0.8],
      ["schedule", 0.12],
      ["program", 0.15],
      ["program", 0.8],
      ["closing", 0.1],
    ]) {
      await page
        .locator(`[data-chapter="${name}"]`)
        .evaluate(async (el, offset) => {
          const { scrollY, innerHeight, performance, requestAnimationFrame } =
            globalThis;
          const from = scrollY;
          const to =
            el.getBoundingClientRect().top + from - innerHeight * offset;
          await new Promise((resolve) => {
            const start = performance.now();
            const step = (time) => {
              const p = Math.min(1, (time - start) / 2200);
              globalThis.scrollTo({
                top: from + (to - from) * p * p * (3 - 2 * p),
                behavior: "instant",
              });
              if (p < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          });
        }, offset);
    }
    await cdp.send("Page.stopScreencast");
    await pending;
    const data = await recorder.evaluate(() => globalThis.finishVideo());
    await writeFile(
      `${output}/scroll-${width}.webm`,
      Buffer.from(data, "base64"),
    );
    await writeFile(
      `${output}/scroll-${width}.json`,
      JSON.stringify(
        {
          frames,
          viewport: { width, height: 900 },
          note: "Real Chromium frames captured with CDP, encoded by MediaRecorder; scripted forward/reverse scroll, not a device frame-rate benchmark.",
        },
        null,
        2,
      ),
    );
    await recorder.close();
    await context.close();
  }
  console.log(output);
} finally {
  await browser.close();
}
