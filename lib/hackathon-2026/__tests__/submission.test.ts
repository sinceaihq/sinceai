import {
  AI_POLICY,
  BUILDING_FAQ,
  BUILDING_HREF,
  CHECKLISTS,
  COMPUTING_HREF,
  CRITICAL_PATH,
  DETAILS,
  SUBMISSION,
  type GuideDetail,
} from "@/lib/hackathon-2026";

const faq = (items: readonly GuideDetail[], q: RegExp) => {
  const item = items.find((i) => q.test(i.q));
  if (!item) throw new Error(`No FAQ item matching ${q}`);
  return `${item.q} ${item.a} ${(item.points ?? []).join(" ")}`;
};

describe("AI tools policy", () => {
  it("permits and encourages AI, naming the common tools as examples", () => {
    for (const tool of ["ChatGPT", "Claude and Claude Code", "Google Gemini", "GitHub Copilot", "Cursor", "Lovable", "OpenCode"]) {
      expect(AI_POLICY.tools).toContain(tool);
    }
    expect(AI_POLICY.headline).toBe("Build with AI. We encourage it.");
    expect(AI_POLICY.toolsNote).toMatch(/any other AI assistant, coding agent, model/);
    const answer = faq(BUILDING_FAQ, /^Can we use ChatGPT, Claude, Cursor, GitHub Copilot, Gemini, Lovable/);
    expect(answer).toMatch(/permitted and encouraged/);
  });

  it("does not make AI or a paid subscription a requirement", () => {
    expect(AI_POLICY.notRequired).toMatch(/not a requirement/);
    expect(AI_POLICY.notRequired).toMatch(/paid subscription/);
  });

  it("keeps the team responsible: verify, explain, disclose, separate earlier work, follow licences and challenge rules", () => {
    const text = AI_POLICY.responsibilities.join(" ");
    expect(text).toMatch(/verify generated code/);
    expect(text).toMatch(/explain your engineering decisions/);
    expect(text).toMatch(/Disclose the main AI tools/);
    expect(text).toMatch(/No need to label AI-written lines/);
    expect(text).toMatch(/pre-existing code and assets/);
    expect(text).toMatch(/Licences, the challenge's rules and its data restrictions still apply/);
  });

  it("says AI use does not hurt judging, without inventing a rubric", () => {
    const answer = faq(BUILDING_FAQ, /AI-generated code hurt our judging/);
    expect(answer).toMatch(/does not count against you/);
    expect(answer).toMatch(/never excuses code that doesn't work or data you weren't allowed to use/);
    expect(answer).toMatch(/Each challenge company evaluates its own challenge with its own criteria/);
    expect(answer).toMatch(/jury selects the overall winner/);
    expect(answer).not.toMatch(/\d+\s*%|\bweight|\bpoints?\b|guarantee/i);
  });

  it("covers repositories, agents, security practice, licences and challenge IP", () => {
    const repo = faq(BUILDING_FAQ, /own GitHub repositories/);
    for (const re of [/never in a commit/, /least access/, /review the changes an agent makes/, /open-source licences/, /personal or confidential data/, /No VPN or virtual machine is required/]) {
      expect(repo).toMatch(re);
    }
    const ip = faq(BUILDING_FAQ, /Who owns what we build/);
    expect(ip).toMatch(/It depends on the challenge/);
    expect(ip).toMatch(/every team member must read and accept them personally/);
    expect(ip).not.toMatch(/you (always )?keep all|automatically (own|retain)/i);
    expect(ip).toMatch(/Never publish confidential agreements/);
  });
});

describe("submission facts (as built in sinceai.app)", () => {
  it("names sinceai.app as the official platform, not Devpost", () => {
    expect(SUBMISSION.platform).toBe("sinceai.app");
    expect(SUBMISSION.notDevpost).toMatch(/not Devpost/);
    expect(SUBMISSION.notDevpost).toMatch(/Devpost alone is not a submission/);
    expect(faq(BUILDING_FAQ, /Do we need Devpost/)).toMatch(/not Devpost/);
    expect(CRITICAL_PATH.builders?.find((s) => s.label === "Submit")?.text).toMatch(/sinceai\.app, not Devpost/);
  });

  it("has the fixed deadline: Sunday 8 November 2026, 10:00 EET", () => {
    expect(SUBMISSION.deadline).toBe("2026-11-08T10:00:00+02:00");
    expect(new Date(SUBMISSION.deadline).toISOString()).toBe("2026-11-08T08:00:00.000Z");
    expect(SUBMISSION.deadlineLabel).toBe("Sunday 8 November, 10:00 EET");
    expect(JSON.stringify(SUBMISSION)).not.toMatch(/midnight|23:59/);
  });

  it("lists the form's required fields, including GenAI disclosure and each member's IP acceptance", () => {
    expect(SUBMISSION.required.map((f) => f.name)).toEqual([
      "Challenge",
      "Project name",
      "Submission URL",
      "About the project",
      "Repository / demo link",
      "Built with",
      "Technology feedback",
      "GenAI tools used",
      "Generative AI in your project",
      "Challenge IP terms",
    ]);
    expect(SUBMISSION.required.find((f) => f.name === "Challenge IP terms")?.note).toMatch(/Every team member/);
  });

  it("keeps the video, deck and documents optional", () => {
    const optional = SUBMISSION.optional.map((f) => f.name);
    expect(optional).toContain("Submission video URL");
    expect(optional).toContain("Files");
    expect(SUBMISSION.required.map((f) => f.name).join(" ")).not.toMatch(/video|deck|document/i);
    const answer = faq(BUILDING_FAQ, /demo video or a pitch deck required/);
    expect(answer).toMatch(/Neither is required/);
    expect(SUBMISSION.strongEntry.join(" ")).toMatch(/recommended, not required/);
  });

  it("lists exactly the formats the upload allow-list accepts — and no ZIP", () => {
    expect(SUBMISSION.files.map((f) => [f.kind, f.formats])).toEqual([
      ["Pitch deck", ["PDF", "PPT", "PPTX"]],
      ["Supporting documents", ["PDF", "PPT", "PPTX", "DOC", "DOCX", "TXT", "Markdown"]],
      ["Demo video", ["MP4", "WebM"]],
    ]);
    expect(SUBMISSION.files.flatMap((f) => f.formats)).not.toContain("ZIP");
    expect(SUBMISSION.filesNote).toMatch(/ZIP archives are not accepted/);
    expect(faq(BUILDING_FAQ, /Which files can we upload/)).toMatch(/ZIP files are not accepted/);
    // Limits are server configuration: never quoted.
    expect(JSON.stringify(SUBMISSION)).not.toMatch(/\d+\s*(MB|GB)/);
  });

  it("orders the flow: IP terms, then save, then files, then a final check", () => {
    const titles = SUBMISSION.steps.map((s) => s.title);
    expect(titles).toEqual([
      "Prepare the details",
      "Check your links",
      "Everyone accepts the IP terms",
      "Submit and save",
      "Add files",
      "Check before 10:00",
    ]);
    expect(SUBMISSION.steps[3]!.text).toMatch(/Files attach to a saved submission/);
    expect(SUBMISSION.steps[3]!.text).toMatch(/one entry per team/);
  });

  it("links the builder section from the hub", () => {
    expect(BUILDING_HREF).toBe("/hackathon-2026/guide/builders#building");
  });
});

describe("builder FAQ and checklist", () => {
  it("treats a late arrival as an approved exception that never reopens a locked team", () => {
    const answer = faq(DETAILS.builders, /arrives after Friday's Team check/);
    expect(answer).toMatch(/approved for that person in advance/);
    expect(answer).toMatch(/before teams lock at 16:45/);
    expect(answer).toMatch(/never reopens a locked team/);
    expect(answer).toMatch(/checks in personally/);
    expect(answer).toMatch(/browsing the app from elsewhere is not checking in/);
    expect(answer).toMatch(/team's owner makes the selection at 17:00–17:30/);
    expect(answer).toMatch(/no remote participation/);
    expect(answer).not.toMatch(/automatically (approved|allowed)/i);
  });

  it("answers Wi-Fi and Linux briefly and points to the Wi-Fi instructions", () => {
    const item = DETAILS.builders.find((i) => /Wi-Fi/.test(i.q))!;
    expect(item.a).toMatch(/free Wi-Fi is arranged/);
    expect(item.a).toMatch(/TUAS Guest or eduroam at EduCity/);
    expect(item.a).toMatch(/Linux, Windows and macOS/);
    expect(item.links).toEqual([{ label: "Wi-Fi instructions", href: "#wifi" }]);
  });

  it("qualifies food and drink: meals by RSVP, the rest sold separately, nothing promised overnight", () => {
    const item = DETAILS.builders.find((i) => /bring my own food/.test(i.q))!;
    const text = `${item.a} ${item.points!.join(" ")}`;
    expect(text).toMatch(/Meal RSVP/);
    expect(text).toMatch(/sells .*coffee.* separately/);
    expect(text).toMatch(/food service is not/);
    expect(text).toMatch(/don't count on them overnight/);
    expect(text).not.toMatch(/unlimited|free coffee|all night/i);
    // Meal times come from the food section, not a copy here.
    expect(text).not.toMatch(/\d\d:\d\d/);
    expect(item.links).toEqual([{ label: "Meal times and menu", href: "/hackathon-2026/guide/venue#food" }]);
  });

  it("points to the CSC / LUMI section instead of repeating private instructions", () => {
    const item = DETAILS.builders.find((i) => /CSC \/ LUMI/.test(i.q))!;
    expect(item.a).toMatch(/Friday 30 October 2026/);
    expect(item.a).toMatch(/sent to you privately/);
    expect(item.links!.map((l) => l.href)).toContain(COMPUTING_HREF);
  });

  it("separates acceptance, team membership and on-site check-in", () => {
    const answer = faq(BUILDING_FAQ, /complete before arriving/);
    expect(answer).toMatch(/accepted to the hackathon/);
    expect(answer).toMatch(/accepted member of your team in sinceai\.app/);
    expect(answer).toMatch(/check in personally on site/);
    const before = CHECKLISTS.builders.find((g) => g.title === "Before you arrive")!.items.join(" ");
    for (const re of [/own sinceai\.app account/, /same team in sinceai\.app/, /Attendance confirmed/, /Meal RSVP done .* by Friday 30 October 2026/, /repository is set up/, /CSC \/ LUMI/]) {
      expect(before).toMatch(re);
    }
    const day = CHECKLISTS.builders.find((g) => g.title === "On the day")!.items.join(" ");
    expect(day).toMatch(/every team member has accepted the challenge IP terms/);
  });

  it("uses well-formed links only: guide paths, in-page anchors or https", () => {
    for (const item of [...BUILDING_FAQ, ...DETAILS.builders]) {
      for (const link of item.links ?? []) {
        expect(link.href).toMatch(/^(\/hackathon-2026\/guide[\w/-]*(#[\w-]+)?|#[\w-]+|https:\/\/[\w.-]+\/\S*)$/);
      }
    }
  });
});
