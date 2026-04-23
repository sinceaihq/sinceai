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
