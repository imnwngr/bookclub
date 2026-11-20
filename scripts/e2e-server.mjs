import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
const root = path.resolve("dist-e2e");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let filename =
    decodeURIComponent(url.pathname).replace(/^\/hsv\/?/, "") ||
    "index.html";
  if (filename.endsWith("/")) filename += "index.html";
  const target = path.resolve(root, filename);
  try {
    if (!target.startsWith(root + path.sep)) throw new Error("outside");
    const content = await readFile(target);
    const compressed = process.env.E2E_GZIP === "true" && /gzip/.test(req.headers["accept-encoding"] ?? "") && [".html", ".js", ".css", ".svg"].includes(path.extname(target));
    const body = compressed ? gzipSync(content) : content;
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] ?? "application/octet-stream",
      ...(compressed ? { "Content-Encoding": "gzip", "Vary": "Accept-Encoding" } : {}),
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(path.join(root, "404.html")));
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "GitHub Pages-style local server http://127.0.0.1:4173/hsv/",
  ),
);
process.on("SIGTERM", () => server.close());
