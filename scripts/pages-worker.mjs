// After `next build`, bundle the edge Worker into out/_worker.js so the same
// build runs on Cloudflare Pages (advanced mode) as well as Workers + assets.
// _routes.json keeps Pages from invoking the worker for static files.
import { build } from "esbuild";
import { writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
await build({
  entryPoints: [`${root}worker/index.ts`],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: `${root}out/_worker.js`,
  minify: true,
  legalComments: "none",
});
writeFileSync(`${root}out/_routes.json`, JSON.stringify({ version: 1, include: ["/api/*", "/go/*", "/m/*"], exclude: [] }, null, 2));
// Workers static assets: don't publish the worker bundle or the Pages routes file.
writeFileSync(`${root}out/.assetsignore`, "_worker.js\n_routes.json\n");
console.log("pages worker bundled");
