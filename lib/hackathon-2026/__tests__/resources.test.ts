import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  CHECKLISTS,
  COMPUTING_HREF,
  DEVELOPER_TOOLS,
  DEVELOPER_TOOLS_NOTE,
  EVENT_ACCESS,
  MLH_NOTE,
  PARTNER_RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCES_INTRO,
  RESOURCES_PATH,
  STAND_PARTNERS,
  SUBMISSION,
  resourcesIn,
  type PartnerResource,
} from "@/lib/hackathon-2026";

const get = (id: string): PartnerResource => {
  const r = PARTNER_RESOURCES.find((x) => x.id === id);
  if (!r) throw new Error(id);
  return r;
};
const allText = (r: unknown) => JSON.stringify(r);

/** Each resource links only to its own organisation's pages (plus the guide). */
const HOSTS: Record<string, RegExp> = {
  "csc-lumi": /^(lumi-ai-factory\.github\.io|docs\.lumi-supercomputer\.eu)$/,
  "red-hat": /^(developers\.redhat\.com|www\.redhat\.com)$/,
  fiware: /^(www\.fiware\.org|fiware-tutorials\.readthedocs\.io)$/,
  aiven: /^aiven\.io$/,
  "pruna-ai": /^(pruna\.notion\.site|docs\.api\.pruna\.ai|www\.pruna\.ai)$/,
  featherless: /^featherless\.ai$/,
  elevenlabs: /^(docs\.google\.com|elevenlabs\.io)$/,
  lovable: /^docs\.lovable\.dev$/,
  n8n: /^(docs\.n8n\.io|n8n\.notion\.site)$/,
};

describe("builder resources: structure", () => {
  it("groups the verified partner resources into four categories", () => {
    expect(RESOURCE_CATEGORIES.map((c) => c.id)).toEqual(["computing", "models", "building", "standards"]);
    expect(resourcesIn("computing").map((r) => r.id)).toEqual(["csc-lumi", "red-hat", "aiven"]);
    expect(resourcesIn("models").map((r) => r.id)).toEqual(["pruna-ai", "featherless", "elevenlabs"]);
    expect(resourcesIn("building").map((r) => r.id)).toEqual(["lovable", "n8n"]);
    expect(resourcesIn("standards").map((r) => r.id)).toEqual(["fiware"]);
    expect(RESOURCES_PATH).toBe("/hackathon-2026/guide/resources");
  });

  it("gives every resource identity, a description, build ideas, a get-started link, access and help", () => {
    for (const r of PARTNER_RESOURCES) {
      expect(r.relationship).toMatch(/partner$/);
      expect(r.description.length).toBeGreaterThan(30);
      expect(r.buildIdeas.length).toBeGreaterThanOrEqual(2);
      expect(r.access.length).toBeGreaterThan(20);
      expect(r.help.length).toBeGreaterThan(10);
      for (const link of [r.getStarted, r.partnerGuide, r.docs].filter(Boolean)) {
        if (link!.href.startsWith("/")) {
          expect(link!.href).toBe(COMPUTING_HREF);
          continue;
        }
        if (link!.href.startsWith("#")) {
          // FIWARE starts at the Builder Pack resources further down the same page.
          expect([r.id, link!.href]).toEqual(["fiware", "#fiware"]);
          continue;
        }
        const url = new URL(link!.href);
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toMatch(HOSTS[r.id]!);
      }
    }
  });

  it("uses evergreen wording: no countdowns, live statuses or day-specific promises", () => {
    const text = allText([PARTNER_RESOURCES, RESOURCES_INTRO, DEVELOPER_TOOLS, MLH_NOTE]);
    expect(text).not.toMatch(/pending|coming (soon|tomorrow)|today|tomorrow|check back|activation|definitely|guaranteed|unlimited|exclusive|instant/i);
    expect(text).not.toMatch(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w* \d{1,2} Nov|\d{1,2}[–-]\d{1,2} Nov/);
    expect(RESOURCES_INTRO.start).toMatch(/official Since AI participant messages and designated event channels/);
    expect(RESOURCES_INTRO.freedom).toMatch(/free to use the AI tools and development platforms/);
    expect(EVENT_ACCESS).toMatch(/never on this website/);
  });
});

describe("builder resources: what each partner's card says", () => {
  it("CSC / LUMI: done — eligibility and deadline kept, private instructions already sent", () => {
    const r = get("csc-lumi");
    expect(r.benefit).toContain("Friday 30 October 2026");
    expect(r.access).toMatch(/received private instructions by email/);
    expect(r.partnerGuide?.href).toBe(COMPUTING_HREF);
    expect(r.help).toMatch(/on site/);
  });

  it("Red Hat: the free 30-day Developer Sandbox, set up before the event, no invented office hours", () => {
    const r = get("red-hat");
    expect(r.getStarted.href).toBe("https://developers.redhat.com/developer-sandbox");
    expect(r.benefit).toMatch(/free for 30 days/);
    expect(r.benefit).toMatch(/Set it up before the event/);
    expect(r.help).toMatch(/supports builders remotely/);
    expect(r.help).toMatch(/office hours are announced in the event channels/);
    // No booth (Red Hat, 21 Oct 2026). The award is named and linked; its terms live in awards.ts only.
    const { award, ...card } = r;
    expect(award).toBe("Red Hat OpenShift AI Technology Award");
    expect(allText(card)).not.toMatch(/stand|booth|award|prize|€|EUR|1[ ,.]?000/i);
    expect(allText(r)).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("Aiven: documentation only, no event benefit", () => {
    const r = get("aiven");
    expect(r.benefit).toBeUndefined();
    expect(r.access).toMatch(/no event-specific benefit/);
  });

  it("Pruna: a shared key described, never reproduced, and only for backends", () => {
    const r = get("pruna-ai");
    expect(r.benefit).toMatch(/shared hackathon API key/);
    expect(r.benefit).toMatch(/backend only, never in browser or mobile code/);
    expect(r.access).toBe(EVENT_ACCESS);
    expect(allText(r)).not.toMatch(/\$|€|prize|onepager on/i);
  });

  it("Featherless: $25, no card, limited to 1,200 redemptions, private instructions", () => {
    const r = get("featherless");
    expect(r.benefit).toMatch(/\$25 of inference credit per eligible participant/);
    expect(r.benefit).toMatch(/no credit card/);
    expect(r.benefit).toMatch(/up to 1,200/);
    expect(r.access).toBe(EVENT_ACCESS);
    expect(r.partnerGuide).toBeUndefined();
    expect(allText(r)).not.toMatch(/redeem|coupon code|promo|voucher|\.pdf|qr/i);
  });

  it("ElevenLabs: one Creator month via its own Discord process, Showcase separate, no other prize published", () => {
    const r = get("elevenlabs");
    expect(r.benefit).toMatch(/One free month of the Creator plan/);
    expect(r.benefit).toMatch(/Showcase is separate from your official submission in sinceai\.app/);
    expect(r.access).toMatch(/once those details say the event's redemption is open/);
    expect(allText(r)).not.toMatch(/\bPro\b|\bScale\b|winner|prize|best .* project/i);
  });

  it("Lovable: 100 credits per participant, no exclusivity, no host-only playbook", () => {
    const r = get("lovable");
    expect(r.benefit).toBe("100 Lovable credits per participant, shared as a coupon shortly before the event.");
    expect(r.access).toBe(EVENT_ACCESS);
    expect(allText(r)).not.toMatch(/exclusive|only tool|community-hackathon-playbook/i);
  });

  it("n8n: one month of Cloud Pro per redemption, limited to 200, with n8n's public redemption guide", () => {
    const r = get("n8n");
    expect(r.benefit).toBe("One month of n8n Cloud Pro per redemption, limited to 200 redemptions.");
    expect(r.partnerGuide?.href).toBe("https://n8n.notion.site/voucher-code");
    expect(r.access).toBe(EVENT_ACCESS);
  });

  it("publishes only the confirmed amounts", () => {
    const money = allText(PARTNER_RESOURCES).match(/[$€£]\s?\d[\d,.]*/g) ?? [];
    expect(money).toEqual(["$25"]);
    const counts = PARTNER_RESOURCES.flatMap((r) => (r.benefit ?? "").match(/\b\d[\d,]*\b/g) ?? []);
    expect(counts).toEqual(["30", "2026", "30", "25", "1,200", "100", "200"]);
  });
});

describe("developer tools, Google and MLH", () => {
  it("lists popular tools as tools — not partners, no credits", () => {
    expect(DEVELOPER_TOOLS.map((t) => t.name)).toEqual([
      "GitHub",
      "Cursor",
      "Claude",
      "ChatGPT & OpenAI API",
      "Gemini API",
      "Google Cloud",
    ]);
    expect(DEVELOPER_TOOLS_NOTE).toMatch(/not event partners and come with no event credits/);
    for (const t of DEVELOPER_TOOLS) {
      expect(new URL(t.href).protocol).toBe("https:");
      expect(t.text).not.toMatch(/credit|prize|free tier|sponsor/i);
    }
  });

  it("claims no Gemini prize and no Google Cloud credits", () => {
    const text = allText([PARTNER_RESOURCES, DEVELOPER_TOOLS, MLH_NOTE, SUBMISSION]);
    expect(text).not.toMatch(/Best Use of Gemini|Gemini (API )?prize|Google Cloud credit|cloud credit/i);
    expect(SUBMISSION.optional.find((f) => f.name === "Gemini API project number")?.note).toMatch(/unless a prize category you enter asks for it/);
  });

  it("acknowledges MLH, its Friday introduction and points to the seven categories", () => {
    expect(MLH_NOTE).toMatch(/official Major League Hacking 2027 Season Member Event/);
    expect(MLH_NOTE).toMatch(/16:45 on Friday, on the Taidon portaat stage/);
    expect(MLH_NOTE).toMatch(/seven MLH categories are under Optional awards/);
  });

  it("shows on-site partners with their registered roles only", () => {
    expect(STAND_PARTNERS.map((p) => p.id)).toEqual(["solita", "pruna-ai", "bearingpoint", "csc-lumi", "mlh"]);
  });

  it("is in the builders' checklist, with the Red Hat sandbox as an optional step", () => {
    const before = CHECKLISTS.builders.find((g) => g.title === "Before you arrive")!.items.join(" ");
    expect(before).toMatch(/Builder Resources/);
    expect(before).toMatch(/Developer Sandbox is set up before the event/);
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

/** Shapes only — never real values. The third field marks claims checked in published content only, not in tests that assert their absence. */
const RESTRICTED: readonly [string, RegExp, "published"?][] = [
  ["code after a coupon / promo / redemption / voucher label", /\b(coupon|promo|redemption|voucher)\s+code\s*[:=]\s*["'`]?[A-Z0-9]/i],
  ["Featherless redemption or coupon URL", /featherless\.ai\/[^\s"'`)]*(redeem|coupon|promo|claim|code)/i],
  ["Pruna shared API key value", /PRUNA_API_KEY\s*[:=]\s*["'`]?(?!<|\$)[A-Za-z0-9_-]{12,}/],
  ["API key header value", /\bapikey["']?\s*[:=]\s*["'`]?(?!<|\$|\{)[A-Za-z0-9_-]{20,}/i],
  [
    "Google Docs link other than the approved ElevenLabs Hacker Guide or the public volunteer application form",
    /docs\.google\.com\/(?!document\/d\/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto\b|forms\/d\/e\/1FAIpQLSdro-RK8jjZ8BVLXq4ij8m4FcBUOl7Z3QycKwFCFj-xub7dqQ\/viewform\b)[^\s"'`)]+/,
  ],
  ["Google Drive file link", /drive\.google\.com\/file\//],
  ["Notion page other than Pruna's onepager or n8n's redemption guide", /\.notion\.site\/(?!building-with-pruna-at-since-ai-hackathon\b|voucher-code\b)[\w-]+/],
  ["Lovable's host-only community playbook", /community-hackathon-playbook\.lovable\.app/, "published"],
  ["Google Cloud credit or coupon link", /(cloud\.google\.com|google\.com)\/[^\s"'`)]*(credit|coupon|redeem|promo)/i],
  ["Gemini or Google credits, money or coupons (MLH's Gemini category is swag kits only)", /Gemini[^.\n"]{0,40}(credits?\b|€\s?\d|\$\d|coupon)/i, "published"],
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
      const isTest = /(^|[\\/])(e2e|__tests__)[\\/]|\.test\.tsx?$/.test(path.relative(process.cwd(), file));
      for (const [label, re, scope] of RESTRICTED) {
        if (scope === "published" && isTest) continue;
        if (re.test(content)) hits.push(`${path.relative(process.cwd(), file)}: ${label}`);
      }
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
      "https://community-hackathon-playbook.lovable.app/",
      "https://cloud.google.com/billing/redeem?code=x",
      "Gemini API credits for every team",
    ];
    RESTRICTED.forEach(([, re], i) => expect(re.test(samples[i]!)).toBe(true));
    // What is published passes.
    for (const ok of [
      "https://docs.google.com/document/d/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto/edit?usp=sharing",
      "https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon",
      "https://n8n.notion.site/voucher-code",
      "https://docs.cloud.google.com/docs",
      'export PRUNA_API_KEY="<key>"',
      "https://featherless.ai/docs/quickstart-guide",
      "Best Use of Gemini API — MLH Swag Kits",
    ]) {
      expect(RESTRICTED.some(([, re]) => re.test(ok))).toBe(false);
    }
  });
});
