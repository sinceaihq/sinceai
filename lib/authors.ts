/**
 * Blog authors — named people for E-E-A-T and rich author markup.
 * Bios and links power both the visible byline and Person JSON-LD.
 */

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  linkedin: string;
}

export const AUTHORS: Record<string, Author> = {
  "riku-lauttia": {
    id: "riku-lauttia",
    name: "Riku Lauttia",
    role: "Operations Lead, Since AI",
    bio: "Riku leads operations at Since AI, organizing AI hackathons in Turku, Finland and helping builder teams ship production-grade demos.",
    linkedin: "https://www.linkedin.com/in/rikulauttia/",
  },
};

export const DEFAULT_AUTHOR_ID = "riku-lauttia";

export function getAuthor(id: string | undefined): Author {
  return AUTHORS[id ?? DEFAULT_AUTHOR_ID] ?? AUTHORS[DEFAULT_AUTHOR_ID];
}
