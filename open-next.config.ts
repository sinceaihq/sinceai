import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsCache,
  // Prerendered pages are answered from the cache in the routing layer, after redirects and
  // headers, without loading the Next.js server, so a cold worker answers them much sooner.
  // (Must stay off if Partial Prerendering is ever enabled.)
  enableCacheInterception: true,
});
