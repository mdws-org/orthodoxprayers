// Serves the repository on a free local port, for the scripts that open the
// site in a browser. Returns the base URL and a function that stops it.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };

export async function serve(root) {
    const server = createServer((req, res) => {
        let file = join(root, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
        if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!existsSync(file)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
    });
    await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
    return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
