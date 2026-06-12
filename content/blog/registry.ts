import type { ComponentType } from "react";

import AiHackathonProjectIdeas from "./ai-hackathon-project-ideas.mdx";
import BestAiHackathonsInEurope from "./best-ai-hackathons-in-europe.mdx";
import HackathonTechStackGuide from "./hackathon-tech-stack-guide.mdx";
import HowToBuildADemoIn72Hours from "./how-to-build-a-demo-in-72-hours.mdx";
import HowToWinAnAiHackathon from "./how-to-win-an-ai-hackathon.mdx";
import HowToFormAHackathonTeam from "./how-to-form-a-hackathon-team.mdx";

/**
 * Maps each post slug to its rendered MDX body component.
 * Imported only by the server-rendered article page so article bodies
 * never end up in client bundles.
 */
export const blogContent: Record<string, ComponentType> = {
  "ai-hackathon-project-ideas": AiHackathonProjectIdeas,
  "best-ai-hackathons-in-europe": BestAiHackathonsInEurope,
  "hackathon-tech-stack-guide": HackathonTechStackGuide,
  "how-to-build-a-demo-in-72-hours": HowToBuildADemoIn72Hours,
  "how-to-win-an-ai-hackathon": HowToWinAnAiHackathon,
  "how-to-form-a-hackathon-team": HowToFormAHackathonTeam,
};
