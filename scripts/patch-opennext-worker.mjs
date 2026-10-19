import { readFile, writeFile } from "node:fs/promises";

const workerPath = new URL("../.open-next/worker.js", import.meta.url);
const workerSource = await readFile(workerPath, "utf8");

const imageHandlingBlock = `            // Serve images in development.
            // Note: "/cdn-cgi/image/..." requests do not reach production workers.
            if (url.pathname.startsWith("/cdn-cgi/image/")) {
                return handleCdnCgiImageRequest(url, env);
            }
            // Fallback for the Next default image loader.
            if (url.pathname ===
                \`${"${globalThis.__NEXT_BASE_PATH__}"}/_next/image\${globalThis.__TRAILING_SLASH__ ? "/" : ""}\`) {
                return await handleImageRequest(url, request.headers, env);
            }
`;

const disabledImageHandlingBlock = `            // This deployment serves only static images. Reject optimizer routes
            // so the worker never spends CPU on direct /_next/image requests.
            if (url.pathname.startsWith("/cdn-cgi/image/") ||
                url.pathname ===
                    \`${"${globalThis.__NEXT_BASE_PATH__}"}/_next/image\${globalThis.__TRAILING_SLASH__ ? "/" : ""}\`) {
                return new Response("Not Found", { status: 404 });
            }
`;

if (!workerSource.includes(imageHandlingBlock)) {
  throw new Error("OpenNext worker image handling block not found; patch needs updating.");
}

const patchedWorkerSource = workerSource.replace(
  imageHandlingBlock,
  disabledImageHandlingBlock,
);

await writeFile(workerPath, patchedWorkerSource);

// Cache interception skips the homepage in @opennextjs/aws 3.x: the trailing slash is stripped
// before the lookup, so "/" becomes "", which `?? "/"` does not replace. The prerendered
// homepage then always waits for the Next.js server. Same fix as upstream 4.x
// (`localizedPath === "/" ? "/index" : …`); remove once @opennextjs/cloudflare is upgraded.
const middlewarePath = new URL("../.open-next/middleware/handler.mjs", import.meta.url);
const middlewareSource = await readFile(middlewarePath, "utf8");
const rootLookups = [
  ['.includes(localizedPath ?? "/")', '.includes(localizedPath || "/")'],
  ['incrementalCache.get(localizedPath ?? "/index")', 'incrementalCache.get(localizedPath || "/index")'],
];

let patchedMiddlewareSource = middlewareSource;
for (const [from, to] of rootLookups) {
  if (patchedMiddlewareSource.split(from).length !== 2) {
    throw new Error(`OpenNext cache interceptor lookup not found once (${from}); patch needs updating.`);
  }
  patchedMiddlewareSource = patchedMiddlewareSource.replace(from, to);
}

await writeFile(middlewarePath, patchedMiddlewareSource);
