import type { ExperienceLevel } from "@/lib/validators/jobs";

const LEVEL_SUFFIX: Record<ExperienceLevel, string> = {
  ANY: "",
  INTERN: "internship",
  JUNIOR: "junior",
  MID: "",
  SENIOR: "senior",
  LEAD: "lead",
};

export function appendLevelSuffix(
  queries: string[],
  level: ExperienceLevel | undefined,
): string[] {
  const suffix = LEVEL_SUFFIX[level ?? "ANY"] ?? "";
  return suffix ? queries.map((q) => `${q} ${suffix}`) : queries;
}

/** Build SerpAPI query strings from resume skills or overrides. */
export function buildScrapeQueries(
  resume: { skills: string; rawText: string },
  overrides?: { q?: string },
): string[] {
  if (overrides?.q?.trim()) {
    return [overrides.q.trim()];
  }

  let skills: string[] = [];
  try {
    skills = JSON.parse(resume.skills || "[]") as string[];
    if (!Array.isArray(skills)) skills = [];
  } catch {
    skills = [];
  }

  const queries: string[] = [];
  const is = (terms: string[]) =>
    terms.some((t) => skills.some((s) => s.toLowerCase() === t.toLowerCase()));

  const hasEng = is([
    "React",
    "JavaScript",
    "TypeScript",
    "Python",
    "Node.js",
    "Java",
    "Go",
  ]);
  const hasSales = is(["Sales", "CRM", "SaaS", "Account Management"]);

  if (hasSales && hasEng) {
    queries.push("solutions engineer", "sales engineer");
  }
  if (
    is([
      "Machine Learning",
      "Deep Learning",
      "TensorFlow",
      "PyTorch",
      "NLP",
    ])
  ) {
    queries.push("machine learning engineer", "AI engineer");
  }
  if (is(["React", "Vue", "Angular", "Next.js"])) {
    queries.push("frontend developer");
  }
  if (is(["Node.js", "Django", "Flask", "PostgreSQL", "MongoDB"])) {
    queries.push("backend developer");
  }
  if (is(["Data Science", "Pandas", "SQL", "Tableau"])) {
    queries.push("data scientist");
  }

  const hard = skills
    .filter(
      (s) =>
        !["Communication", "Leadership", "Teamwork", "Agile", "Scrum"].includes(s),
    )
    .slice(0, 2);
  hard.forEach((s) => queries.push(s));

  queries.push("software engineer");

  const unique = [...new Set(queries)].slice(0, 6);
  return unique.length > 0 ? unique : ["software engineer"];
}
