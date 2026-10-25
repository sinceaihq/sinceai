import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  CHECKLISTS,
  COMPUTING_HREF,
  EVENT_RESOURCES,
  OTHER_TOOLS,
  PARTNER_DOCS,
  RESOURCES_PATH,
  STAND_PARTNERS,
  type BuilderResource,
} from "@/lib/hackathon-2026";

const get = (id: string): BuilderResource => {
  const r = EVENT_RESOURCES.find((x) => x.id === id);
  if (!r) throw new Error(id);
  return r;
};
const allText = (r: BuilderResource) => JSON.stringify(r);

/** Each resource links only to its own organisation's pages (plus the guide). */
const HOSTS: Record<string, RegExp> = {
  "csc-lumi": /^(lumi-ai-factory\.github\.io|docs\.lumi-supercomputer\.eu|aitta\.csc\.fi)$/,
  "pruna-ai": /^(pruna\.notion\.site|docs\.api\.pruna\.ai|www\.pruna\.ai)$/,
  elevenlabs: /^(docs\.google\.com|elevenlabs\.io)$/,
  featherless: /^featherless\.ai$/,
};

describe("builder resources: what is published", () => {
  it("lists exactly the four verified event resources, in order", () => {
    expect(EVENT_RESOURCES.map((r) => r.id)).toEqual(["csc-lumi", "pruna-ai", "elevenlabs", "featherless"]);
    expect(RESOURCES_PATH).toBe("/hackathon-2026/guide/resources");
  });

  it("gives every resource a quickstart and docs on its own organisation's site, over https", () => {
    for (const r of EVENT_RESOURCES) {
      for (const link of [r.quickstart, r.docs, ...(r.more ?? [])]) {
        if (link.href.startsWith("/")) {
          expect(link.href).toBe(COMPUTING_HREF);
          continue;
        }
        const url = new URL(link.href);
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toMatch(HOSTS[r.id]!);
      }
      expect(r.useCases.length).toBeGreaterThan(0);
      expect(r.instructions.length).toBeGreaterThan(20);
    }
  });

  it("CSC / LUMI: deadline and private instructions, linked to the guide's section", () => {
    const r = get("csc-lumi");
    expect(r.access.text).toContain("Friday 30 October 2026");
    expect(r.instructions).toMatch(/private/);
    expect(r.more?.map((l) => l.href)).toContain(COMPUTING_HREF);
    expect(r.help.kind).toBe("on-site");
  });

  it("Pruna: the shared key comes on Pruna's own page on Friday; no amounts or prizes repeated", () => {
    const r = get("pruna-ai");
    expect(r.access.text).toMatch(/Friday 6 November/);
    expect(r.access.text).toMatch(/never in browser or mobile code/);
    expect(r.quickstart.href).toBe("https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon");
    expect(allText(r)).not.toMatch(/\$|€|prize|credits? worth/i);
    expect(r.help.text).toMatch(/stand is planned/);
  });

  it("ElevenLabs: activation pending, and its Showcase is not the official submission", () => {
    const r = get("elevenlabs");
    expect(r.access.state).toBe("pending");
    expect(r.access.text).toMatch(/not yet confirmed as active/);
    expect(r.access.text).toMatch(/one free month of the Creator plan/i);
    expect(r.instructions).toMatch(/Showcase is ElevenLabs' own — your official submission is always in sinceai\.app/);
    expect(allText(r)).not.toMatch(/instant|guaranteed/i);
  });

  it("Featherless: a product description and a notice only — the instructions come separately on 4–5 November", () => {
    const r = get("featherless");
    expect(r.access.state).toBe("scheduled");
    expect(r.access.text).toMatch(/4–5 November/);
    expect(r.access.text).toMatch(/never published on this website/);
    expect(r.quickstart.href).toBe("https://featherless.ai/docs/quickstart-guide");
    // No code-like token, redemption link, QR or PDF anywhere in the card.
    expect(allText(r)).not.toMatch(/\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]{6,}\b/);
    expect(allText(r)).not.toMatch(/redeem|coupon|promo|voucher|\.pdf|qr/i);
  });

  it("publishes no credit amount except Featherless' confirmed $25", () => {
    const amounts = JSON.stringify([EVENT_RESOURCES, PARTNER_DOCS, OTHER_TOOLS]).match(/[$€£]\s?\d[\d,.]*/g) ?? [];
    expect(amounts).toEqual(["$25"]);
  });

  it("keeps Aiven, Lovable, n8n and Gemini as documentation, not event benefits", () => {
    const ids = EVENT_RESOURCES.map((r) => r.name).join(" ");
    expect(ids).not.toMatch(/Aiven|Lovable|n8n|Gemini|Google/);
    expect(PARTNER_DOCS.map((t) => t.name)).toEqual(["Aiven"]);
    expect(PARTNER_DOCS[0]!.text).toMatch(/No event-specific benefit/);
    expect(OTHER_TOOLS.map((t) => t.name)).toEqual(["Lovable", "n8n", "Gemini API"]);
    for (const t of [...PARTNER_DOCS, ...OTHER_TOOLS]) {
      expect(t.text).not.toMatch(/sponsor|credits? for|free month|on site/i);
      expect(new URL(t.docs.href).protocol).toBe("https:");
    }
  });

  it("shows on-site partners with their registered roles only", () => {
    expect(STAND_PARTNERS.map((p) => p.id)).toEqual(["red-hat", "solita", "pruna-ai", "bearingpoint", "csc-lumi", "mlh"]);
  });

  it("is in the builders' checklist", () => {
    const before = CHECKLISTS.builders.find((g) => g.title === "Before you arrive")!.items.join(" ");
    expect(before).toMatch(/Builder Resources/);
  });
});

// ── Restricted redemption material never enters the public repository ────────

const SCANNED_DIRS = ["app", "components", "lib", "content", "public", "docs", "e2e", "data", "hooks", "types"];
const TEXT_FILE = /\.(tsx?|mjs|cjs|js|json|mdx?|txt|xml|html|css|svg|ics|webmanifest|ya?ml)$/i;

function files(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? (name === "node_modules" ? [] : files(full)) : [full];
  });
}

/** Shapes only — never real values. */
const RESTRICTED: readonly [string, RegExp][] = [
  ["code after a coupon / promo / redemption / voucher label", /\b(coupon|promo|redemption|voucher)\s+code\s*[:=]\s*["'`]?[A-Z0-9]/i],
  ["Featherless redemption or coupon URL", /featherless\.ai\/[^\s"'`)]*(redeem|coupon|promo|claim|code)/i],
  ["Pruna shared API key value", /PRUNA_API_KEY\s*[:=]\s*["'`]?(?!<|\$)[A-Za-z0-9_-]{12,}/],
  ["API key header value", /\bapikey["']?\s*[:=]\s*["'`]?(?!<|\$|\{)[A-Za-z0-9_-]{20,}/i],
  ["Google Docs link other than the approved ElevenLabs Hacker Guide", /docs\.google\.com\/(?!document\/d\/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto\b)[^\s"'`)]+/],
  ["Google Drive file link", /drive\.google\.com\/file\//],
  ["Notion page other than Pruna's onepager", /\.notion\.site\/(?!building-with-pruna-at-since-ai-hackathon\b)[\w-]+/],
];

describe("no restricted redemption material in the public repository", () => {
  const all = SCANNED_DIRS.flatMap((d) => files(path.join(process.cwd(), d))).filter((f) => f !== __filename);
  const text = all.filter((f) => TEXT_FILE.test(f));

  it("scans the site's source and public assets", () => {
    expect(text.length).toBeGreaterThan(200);
  });

  it("has no PDF, QR image or redemption file in public/", () => {
    const suspicious = all.filter(
      (f) => f.includes(`${path.sep}public${path.sep}`) && /\.pdf$|qr[-_.]|coupon|redeem|voucher|featherless.*\.(png|jpe?g|webp)$/i.test(path.basename(f)),
    );
    expect(suspicious.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });

  it("has no coupon codes, redemption links, shared keys or private documents", () => {
    const hits: string[] = [];
    for (const file of text) {
      const content = readFileSync(file, "utf8");
      for (const [label, re] of RESTRICTED) if (re.test(content)) hits.push(`${path.relative(process.cwd(), file)}: ${label}`);
    }
    expect(hits).toEqual([]);
  });

  it("would catch each shape (synthetic examples)", () => {
    const samples = [
      "Promo code: ABC123",
      "https://featherless.ai/redeem?c=x",
      'PRUNA_API_KEY="abcdefghijklmnop"',
      'apikey: "abcdefghijklmnopqrstuvwxyz"',
      "https://docs.google.com/document/d/other/edit",
      "https://drive.google.com/file/d/x/view",
      "https://acme.notion.site/secret-page",
    ];
    RESTRICTED.forEach(([, re], i) => expect(re.test(samples[i]!)).toBe(true));
    // What is published passes.
    for (const ok of [
      "https://docs.google.com/document/d/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto/edit?usp=sharing",
      "https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon",
      'export PRUNA_API_KEY="<key>"',
      "https://featherless.ai/docs/quickstart-guide",
    ]) {
      expect(RESTRICTED.some(([, re]) => re.test(ok))).toBe(false);
    }
  });
});
