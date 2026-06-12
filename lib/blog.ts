/**
 * Blog post metadata.
 * Article bodies are authored as MDX in `content/blog/<slug>.mdx` and
 * rendered locally — Since AI hosts its own blog, no external service.
 *
 * This module is metadata-only so it stays safe to import from client
 * components. The MDX body components live in `content/blog/registry.ts`
 * and are imported only by the server-rendered article page.
 */

export type BlogCategory =
  | "hackathon-guides"
  | "technical"
  | "events"
  | "community";

export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface TocItem {
  id: string;
  label: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  /** Single citable sentence for AI engines to quote directly */
  keyTakeaway: string;
  tags: string[];
  datePublished: string;
  dateModified: string;
  category: BlogCategory;
  readingTime: number;
  keywords: string[];
  featured: boolean;
  /** Author id, resolved against lib/authors.ts */
  author: string;
  /** Question/answer pairs surfaced as on-page FAQ + FAQPage schema (GEO) */
  faqs: BlogFAQ[];
  /** Table of contents — h2 headings with their anchor ids */
  toc: TocItem[];
}

/**
 * Build an articleBody string for JSON-LD from a post's in-memory metadata.
 * This avoids any fs/runtime reads — description, keyTakeaway, and FAQ answers
 * give AI crawlers the most citable sentences from each article.
 */
export function getArticleBody(post: BlogPost): string {
  const parts = [post.description, post.keyTakeaway];
  for (const faq of post.faqs) {
    parts.push(faq.question, faq.answer);
  }
  return parts.join(" ");
}

export const BLOG_CATEGORIES: Record<
  BlogCategory,
  { label: string; description: string }
> = {
  "hackathon-guides": {
    label: "Hackathon Guides",
    description: "Strategies and playbooks for hackathon success",
  },
  technical: {
    label: "Technical Resources",
    description: "Tech stacks, tools, and development guides",
  },
  events: {
    label: "Events",
    description: "AI hackathons and developer events worldwide",
  },
  community: {
    label: "Community",
    description: "Stories and insights from the AI builders community",
  },
};

export const blogPosts: BlogPost[] = [
  {
    slug: "ai-hackathon-project-ideas",
    title: "AI Hackathon Project Ideas: 30 Buildable Concepts in 72 Hours",
    description:
      "30 actionable AI project ideas categorized by difficulty, each with demo structure, required data, stack suggestions, and evaluation methods for hackathon teams.",
    excerpt:
      "Discover 30 buildable AI project ideas for your next hackathon — from RAG Q&A to vision apps — organized by difficulty with stack suggestions and demo frameworks.",
    keyTakeaway:
      "The best hackathon projects solve a specific, demonstrable problem using AI — start with the demo you want to show judges, then build backwards.",
    tags: ["AI", "Hackathons", "Project Ideas", "Development", "Innovation"],
    datePublished: "2026-02-14",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "hackathon-guides",
    readingTime: 12,
    keywords: [
      "AI project ideas",
      "hackathon project ideas",
      "AI applications",
      "72-hour projects",
      "AI hackathon project suggestions",
      "beginner AI projects for hackathons",
    ],
    featured: true,
    toc: [
      { id: "the-72h-buildable-template", label: "The \"72h buildable\" template" },
      { id: "easy-10-high-success-rate-fast-demos-great-for-beginners", label: "Easy (10) — high success rate, fast demos, great for beginners" },
      { id: "medium-10-more-integration-more-product-feel-still-very-doable", label: "Medium (10) — more integration, more \"product feel,\" still very doable" },
      { id: "hard-10-bigger-wow-but-still-feasible-if-scoped-tightly", label: "Hard (10) — bigger \"wow,\" but still feasible if scoped tightly" },
      { id: "how-to-choose-the-right-idea-fast", label: "How to choose the right idea (fast)" },
      { id: "read-next", label: "Read next" },
    ],
    faqs: [
      {
        question: "What are good AI project ideas for a hackathon?",
        answer:
          "Strong hackathon AI projects include RAG question-answering with citations, document/field extraction, support-ticket triage and classification, simple computer-vision defect detection, and multi-step research agents. Start with the demo you want to show judges and build backwards.",
      },
      {
        question: "How do you pick a hackathon project you can build in 72 hours?",
        answer:
          "Choose an idea that is demoable in 30 seconds, uses data you can get today, and has a tiny but credible evaluation. RAG with citations, extraction to structured output, classification/triage, and simple vision detection are the most reliable categories.",
      },
      {
        question: "What is the easiest AI hackathon project for beginners?",
        answer:
          "Beginner-friendly projects with high success rates include a support-ticket triage copilot, a meeting-notes to action-items extractor, and a PDF policy Q&A tool with citations. They have fast demos and need only small, synthetic datasets.",
      },
    ],
  },
  {
    slug: "best-ai-hackathons-in-europe",
    title: "Best AI Hackathons in Europe",
    description:
      "Curated guide to Europe's top AI hackathons including Junction, Datathon ETH Zurich, GenAI Zurich, Hack Kosice, MLH Europe, EU-backed challenges, and the Since AI Hackathon.",
    excerpt:
      "Your curated guide to the best AI hackathons across Europe — from Junction in Finland to GenAI Zurich — with selection criteria and winning strategies.",
    keyTakeaway:
      "Europe has a thriving AI hackathon scene with events like Junction (Finland), Datathon (ETH Zurich), GenAI Zurich, and the Since AI Hackathon (Turku) — choose based on your goals: networking, prizes, learning, or portfolio building.",
    tags: ["AI", "Hackathons", "Europe", "Events", "Community"],
    datePublished: "2026-02-14",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "events",
    readingTime: 9,
    keywords: [
      "AI hackathons Europe",
      "best hackathons Europe",
      "European developer events",
      "AI competitions Europe",
      "where to find AI hackathons in Europe",
      "top European AI events",
    ],
    featured: true,
    toc: [
      { id: "what-best-ai-hackathon-actually-means", label: "What \"best AI hackathon\" actually means" },
      { id: "europes-best-ai-first-and-ai-heavy-hackathons", label: "Europe's best AI-first and AI-heavy hackathons" },
      { id: "how-to-pick-the-right-one-fast-decision-guide", label: "How to pick the right one (fast decision guide)" },
      { id: "how-to-get-accepted-and-not-waste-your-application", label: "How to get accepted (and not waste your application)" },
      { id: "how-to-win-once-youre-inside", label: "How to win once you're inside" },
    ],
    faqs: [
      {
        question: "What are the best AI hackathons in Europe?",
        answer:
          "Top European AI hackathons include Junction (Finland), Datathon at ETH Zürich, GenAI Zürich, Hack Kosice (Slovakia), MLH-listed Europe/UK events, HackLondon, EU-backed challenge hackathons, and the Since AI Hackathon in Turku, Finland.",
      },
      {
        question: "How do you choose which AI hackathon to attend?",
        answer:
          "Choose based on your goal. For career leverage pick Junction, EU-backed thematic events, or Since AI (company challenges plus production support). To level up fast pick MLH or HackLondon student events. For GenAI product positioning pick GenAI Zürich-type events.",
      },
      {
        question: "How do you get accepted to a competitive hackathon?",
        answer:
          "Show 2–3 past projects on GitHub, write a one-sentence demo plan ('We build X for Y users, takes input A, outputs B, saves Z'), and demonstrate that you understand constraints by committing to a working demo early.",
      },
    ],
  },
  {
    slug: "hackathon-tech-stack-guide",
    title: "Hackathon Tech Stack Guide",
    description:
      "Battle-tested technology stack recommendations for shipping reliable hackathon demos: the Next.js + FastAPI default stack, AI-specific choices, and deployment strategies.",
    excerpt:
      "Battle-tested tech stack recommendations for hackathon demos — from the default Next.js + FastAPI setup to AI-specific choices for RAG, extraction, and classification.",
    keyTakeaway:
      "Pick boring, reliable technology for hackathons — Next.js + FastAPI with one AI pipeline and local storage is the safe default. Save innovation for the AI layer, not the infrastructure.",
    tags: ["AI", "Technology", "Hackathons", "Development", "Tools"],
    datePublished: "2026-02-09",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "technical",
    readingTime: 10,
    keywords: [
      "hackathon tech stack",
      "AI development stack",
      "hackathon tools",
      "React FastAPI",
      "best tech stack for AI hackathon",
      "hackathon technology choices",
    ],
    featured: false,
    toc: [
      { id: "the-only-thing-that-matters-speed-to-a-stable-demo", label: "The only thing that matters: speed to a stable demo" },
      { id: "the-hackathon-stack-pyramid-what-to-choose-first", label: "The hackathon stack pyramid (what to choose first)" },
      { id: "recommended-default-stacks-pick-one-and-commit", label: "Recommended default stacks (pick one and commit)" },
      { id: "the-best-tech-stack-is-role-based", label: "The best tech stack is role-based" },
      { id: "ai-hackathon-core-choose-the-simplest-wow", label: "AI hackathon core: choose the simplest \"wow\"" },
      { id: "deployment-only-if-the-hackathon-requires-it", label: "Deployment: only if the hackathon requires it" },
      { id: "the-72h-repo-structure-that-keeps-you-sane", label: "The \"72h repo structure\" that keeps you sane" },
      { id: "the-stack-decision-checklist-5-minutes", label: "The \"stack decision\" checklist (5 minutes)" },
      { id: "example-a-winning-stack-ai-doc-copilot", label: "Example: a winning stack (AI doc copilot)" },
    ],
    faqs: [
      {
        question: "What is the best tech stack for an AI hackathon?",
        answer:
          "The recommended default is Next.js for the frontend and FastAPI (or Node/Express) for the backend, with one AI pipeline (RAG, extraction, or classification) and local files or SQLite for storage. Prioritize reliability and speed-to-demo over complexity.",
      },
      {
        question: "Should you deploy your hackathon project?",
        answer:
          "Only if the hackathon requires it. Default to a local demo with a demo-mode fallback and cached outputs for your example inputs. If you must deploy, keep it to one simple service.",
      },
      {
        question: "What technologies should you avoid in a hackathon?",
        answer:
          "Avoid microservices, Kubernetes, complex auth flows, multi-database setups, building your own UI framework, and training a model from scratch. They add integration risk that kills demos. Hackathons reward proof, not architecture.",
      },
    ],
  },
  {
    slug: "how-to-build-a-demo-in-72-hours",
    title: "How to Build a Demo in 72 Hours",
    description:
      "A demo-first approach to hackathon success: build the skeleton first, add AI features incrementally, ensure reliability with caching and offline modes, and create measurable proof.",
    excerpt:
      "Master the demo-first approach to hackathon success — build skeleton first, layer AI features incrementally, and ship a reliable product judges will remember.",
    keyTakeaway:
      "Judges evaluate what they can see — a polished demo with limited features beats a complex AI system that crashes during the presentation.",
    tags: ["AI", "Hackathons", "Demo", "MVP", "Product"],
    datePublished: "2026-02-09",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "hackathon-guides",
    readingTime: 8,
    keywords: [
      "hackathon demo",
      "build demo fast",
      "AI hackathon guide",
      "demo-first development",
      "build AI demo in 72 hours",
      "hackathon demo strategies",
    ],
    featured: false,
    toc: [
      { id: "the-one-rule-that-changes-everything-build-the-demo-first", label: "The one rule that changes everything: build the demo first" },
      { id: "step-0-define-your-demo-in-one-sentence", label: "Step 0: Define your demo in one sentence" },
      { id: "step-1-design-the-30-second-demo-path", label: "Step 1: Design the \"30-second demo path\"" },
      { id: "step-2-make-a-demo-dataset-you-fully-control", label: "Step 2: Make a \"demo dataset\" you fully control" },
      { id: "step-3-build-a-clickable-skeleton", label: "Step 3: Build a clickable skeleton" },
      { id: "step-4-add-the-smallest-smart-core-that-matters", label: "Step 4: Add the smallest \"smart core\" that matters" },
      { id: "step-5-make-it-judge-proof", label: "Step 5: Make it judge-proof" },
      { id: "step-6-add-proof-in-tiny-numbers", label: "Step 6: Add proof in tiny numbers" },
      { id: "step-7-polish-what-people-feel", label: "Step 7: Polish what people feel" },
      { id: "step-8-build-the-pitch-as-a-demo-wrapper", label: "Step 8: Build the pitch as a demo wrapper" },
      { id: "the-hour-by-hour-72h-plan", label: "The hour-by-hour 72h plan" },
    ],
    faqs: [
      {
        question: "How do you build a hackathon demo in 72 hours?",
        answer:
          "Use a demo-first approach: define the demo in one sentence, ship a clickable skeleton with hardcoded output in the first 6 hours, then add one AI feature, then reliability (caching and demo mode), then measurable proof, then UI polish, and finally rehearse the demo.",
      },
      {
        question: "How long should a hackathon demo be?",
        answer:
          "Aim for a 90-second demo script: a 10-second hook, show the input, generate the output, take one action, present proof in numbers, and close with the next step. If you can't do it in 90 seconds, your scope is too big.",
      },
      {
        question: "How do you make a hackathon demo reliable?",
        answer:
          "Cache outputs for your 5–10 demo inputs, add a demo-mode toggle that uses cached results, handle timeouts and rate limits gracefully, use strict output formats and retries, and prepare an offline fallback in case Wi-Fi fails.",
      },
    ],
  },
  {
    slug: "how-to-win-an-ai-hackathon",
    title: "How to Win an AI Hackathon",
    description:
      "A demo-first playbook for winning AI hackathons: pick the right problem, ship a reliable product, show proof fast, and pitch so judges remember you.",
    excerpt:
      "A demo-first playbook for winning AI hackathons: pick the right problem, ship a reliable product, show proof fast, and pitch so judges remember you.",
    keyTakeaway:
      "Winning hackathon teams don't build the most complex AI — they demonstrate the most convincing solution to a real problem with measurable proof.",
    tags: ["AI", "Hackathons", "Demo"],
    datePublished: "2026-02-08",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "hackathon-guides",
    readingTime: 7,
    keywords: [
      "win AI hackathon",
      "hackathon winning strategy",
      "AI hackathon tips",
      "hackathon pitch",
      "how to win hackathon",
    ],
    featured: false,
    toc: [
      { id: "the-real-scoring-system-even-when-its-not-written", label: "The real scoring system (even when it's not written)" },
      { id: "rule-1-build-the-demo-first-yes-first", label: "Rule #1: Build the demo first (yes, first)" },
      { id: "rule-2-pick-a-problem-that-hurts-and-can-be-proven-fast", label: "Rule #2: Pick a problem that \"hurts\" and can be proven fast" },
      { id: "rule-3-choose-the-smallest-ai-that-matters", label: "Rule #3: Choose the smallest \"AI that matters\"" },
      { id: "rule-4-win-with-a-one-screen-product", label: "Rule #4: Win with a \"one-screen product\"" },
      { id: "rule-5-make-your-solution-judge-proof", label: "Rule #5: Make your solution judge-proof" },
      { id: "a-winning-72-hour-execution-plan", label: "A winning 72-hour execution plan" },
      { id: "the-pitch-script-that-wins-2-minutes", label: "The pitch script that wins (2 minutes)" },
    ],
    faqs: [
      {
        question: "How do you win an AI hackathon?",
        answer:
          "Build the demo first, pick a problem with a specific user and clear pain, use the smallest AI feature that creates a visible wow moment, make it reliable with caching and guardrails, show measurable proof, and structure your pitch around problem, solution, and proof.",
      },
      {
        question: "What do hackathon judges actually score?",
        answer:
          "Even when rubrics say 'innovation,' winners maximize clarity (what problem, for whom), execution (a working, stable demo), impact (measurable improvement), differentiation, and story and delivery that judges can repeat ten minutes later.",
      },
      {
        question: "Do you need a complex model to win an AI hackathon?",
        answer:
          "No. Judges reward usefulness, not complexity. A simple, reliable product built on RAG plus extraction wins constantly because it solves a real problem and can be demonstrated convincingly.",
      },
    ],
  },
  {
    slug: "how-to-form-a-hackathon-team",
    title:
      "How to Form a Hackathon Team (Like a Startup)\u2014The Timeless Playbook",
    description:
      "A practical guide to building a winning hackathon team like a startup: roles, responsibilities, decision-making, and execution rhythm for 72-hour success.",
    excerpt:
      "A practical guide to building a winning hackathon team like a startup: roles, responsibilities, decision-making, and execution rhythm for 72-hour success.",
    keyTakeaway:
      "The best hackathon teams operate like startup founding teams — small (3-5 people), with clear roles (tech lead, product, AI specialist, pitch lead), and one designated decision-maker.",
    tags: ["AI", "Hackathons", "Teams"],
    datePublished: "2026-02-08",
    dateModified: "2026-06-12",
    author: "riku-lauttia",
    category: "hackathon-guides",
    readingTime: 6,
    keywords: [
      "hackathon team building",
      "form hackathon team",
      "hackathon roles",
      "startup team structure",
      "hackathon team tips",
    ],
    featured: false,
    toc: [
      { id: "the-core-idea-optimize-for-ship-story-in-72-hours", label: "The core idea: optimize for \"ship + story\" in 72 hours" },
      { id: "the-ideal-team-size-why-3-5-wins", label: "The ideal team size (why 3–5 wins)" },
      { id: "the-5-roles-that-win", label: "The 5 roles that win" },
      { id: "the-underrated-roles-if-you-have-4-5-people", label: "The underrated roles (if you have 4–5 people)" },
      { id: "the-best-team-compositions", label: "The best team compositions" },
      { id: "the-most-important-rule-one-decision-maker-per-area", label: "The most important rule: one decision-maker per area" },
      { id: "the-team-contract-5-lines-that-prevent-drama", label: "The \"team contract\" (5 lines that prevent drama)" },
      { id: "how-to-recruit-teammates-fast-and-avoid-mismatches", label: "How to recruit teammates fast (and avoid mismatches)" },
    ],
    faqs: [
      {
        question: "What is the ideal hackathon team size?",
        answer:
          "Three to five people. Three gives the fastest alignment, four balances build, product, and pitch, and five works only if roles are crystal clear. More than five and you lose time to meetings and merge conflicts.",
      },
      {
        question: "What roles does a winning hackathon team need?",
        answer:
          "Cover five responsibilities: tech lead/builder, AI/ML engineer, product/UX (demo flow owner), business/value lead, and pitch. With four or five people, add a data/research scout or an infra/demo-reliability owner.",
      },
      {
        question: "How do you avoid conflict in a hackathon team?",
        answer:
          "Assign one decision-maker per area (architecture, scope, problem framing, story), agree on a short team contract, and run a five-minute standup every two to three hours covering what shipped, what is blocked, and what is next.",
      },
    ],
  },
];

/**
 * Get blog posts filtered by category
 */
export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return blogPosts.filter((post) => post.category === category);
}

/**
 * Get a single blog post by slug
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

/**
 * Get featured blog posts
 */
export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((post) => post.featured);
}

/**
 * Get latest N blog posts (already sorted by date descending)
 */
export function getLatestPosts(count: number): BlogPost[] {
  return blogPosts.slice(0, count);
}

/**
 * Get the previous and next posts relative to a slug (by list order).
 */
export function getAdjacentPosts(slug: string): {
  previous: BlogPost | null;
  next: BlogPost | null;
} {
  const index = blogPosts.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? blogPosts[index - 1] : null,
    next: index < blogPosts.length - 1 ? blogPosts[index + 1] : null,
  };
}
