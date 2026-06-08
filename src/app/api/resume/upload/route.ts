// src/app/api/resume/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma, ensureUserResumeDir } from "@/db";
import { complete, parseJSON, MODEL_FAST } from "@/lib/llm";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import {
  extractTextFromPdfBuffer,
  isPdfUpload,
  MAX_RESUME_PAGES,
  resumeTextForAI,
} from "@/lib/pdf-extract.server";

// ─── Text cleaning ────────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  text = text
    .replace(/([a-zA-Z0-9])\s{1,3}@\s{0,2}([a-zA-Z0-9])/g, "$1@$2")
    .replace(/gmail\s*\.\s*com/gi, "gmail.com")
    .replace(/(\d+)\s*([\u2013\-])\s*(\d+)/g, "$1$2$3");

  const rawLines = text.split("\n");
  const out: string[] = [];

  for (const rl of rawLines) {
    const line = rl.trim();
    if (!line) continue;

    if (
      line.length > 300 &&
      /\b(Education|Experience|Projects|Skills|Summary|Achievements|Certification)\b/i.test(line)
    ) {
      const split = line
        .replace(
          /\s+(Education|Work Experience|Experience|Projects|Technical Skills|Skills|Summary|Profile|Achievements|Certifications|Awards)\s+/gi,
          "\n\n$1\n"
        )
        .replace(/\s*([•▸►✓→◦▪])\s*/g, "\n• ")
        .replace(/\.\s+([A-Z][a-z]{2,})/g, ".\n$1")
        .split("\n");
      out.push(...split.map((s: string) => s.trim()).filter(Boolean));
    } else {
      out.push(line);
    }
  }

  return out.join("\n");
}

function extractBullets(text: string): string[] {
  return text.split("\n").filter((line) => {
    const t = line.trim();
    if (t.length < 15 || t.length > 400) return false;
    if (/^[•\-*▸►✓→◦▪‣⁃]/.test(t)) return true;
    return /^(Built|Developed|Engineered|Designed|Implemented|Led|Managed|Created|Optimized|Reduced|Increased|Improved|Deployed|Automated|Scaled|Delivered|Achieved|Performed|Collaborated|Conducted|Established|Generated|Launched|Maintained|Produced|Trained|Integrated|Configured|Analyzed|Researched|Architected|Migrated|Contributed|Assisted|Spearheaded|Drove|Transformed|Presented|Mentored|Worked|Supported|Documented|Debugged|Tested|Reviewed)\b/i.test(t);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ATSSection = {
  found: boolean;
  score: number;
  issues: string[];
  tips: string[];
};

type RuleBasedResult = {
  sections: Record<string, ATSSection>;
  totalRuleScore: number;
  formatIssues: string[];
  missingKeywords: string[];
  presentKeywords: string[];
  bulletCount: number;
  quantifiedCount: number;
  weakVerbs: string[];
  wordCount: number;
  estimatedPages: number;
  technicalSkills: string[];
  softSkills: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_PATTERNS = {
  contact:      /(?:email|phone|linkedin|github|portfolio|@|tel:|mob:)/i,
  summary:      /(?:summary|objective|profile|about me|professional summary|career objective)/i,
  experience:   /(?:experience|work history|employment|internship|positions|roles)/i,
  education:    /(?:education|academic|university|college|degree|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bachelor|master)/i,
  skills:       /(?:skills|technologies|tech stack|tools|languages|frameworks|competencies)/i,
  projects:     /(?:projects|portfolio|side projects|personal projects|academic projects)/i,
  achievements: /(?:achievements|awards|honors|certifications|certificates|accomplishments)/i,
};

const WEAK_VERBS = [
  "helped", "worked", "did", "made", "got", "used", "was", "were",
  "assisted", "supported", "involved", "participated", "contributed to",
  "responsible for", "duties included", "tasks included",
];

const TECHNICAL_SKILLS_LIST = [
  "python","javascript","typescript","java","c++","c#","go","rust","ruby","php","swift","kotlin","scala","dart","matlab","r",
  "react","react.js","vue","angular","next.js","svelte","html","css","tailwind","bootstrap","sass","ejs","redux",
  "node.js","express","express.js","fastapi","django","flask","spring","spring boot","laravel","graphql","rest","rest apis","asp.net",
  "tensorflow","pytorch","scikit-learn","keras","hugging face","transformers","lora","pandas","numpy","seaborn","matplotlib",
  "machine learning","deep learning","nlp","computer vision","llm","fine-tuning","xgboost","opencv","azure ai",
  "sql","mysql","postgresql","mongodb","firebase","redis","sqlite","supabase","dynamodb",
  "aws","azure","gcp","docker","kubernetes","ci/cd","github actions","terraform","render","vercel","netlify","linux","bash",
  "git","github","postman","vs code","jupyter","google colab","jira","figma","webpack","vite",
];

const SOFT_SKILLS_LIST = [
  "communication","leadership","teamwork","problem solving","critical thinking","adaptability",
  "time management","collaboration","creativity","attention to detail","project management",
  "analytical","agile","scrum","cross-functional","stakeholder","presentation","mentoring",
];

const ATS_POWER_KEYWORDS = [
  "python","javascript","typescript","react","node.js","sql","git","aws","docker","api",
  "machine learning","data analysis","agile","cross-functional","stakeholder","end-to-end",
  "scalable","production","collaborated","mentored","deployed","integrated",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  return score >= 90 ? "A"  :
         score >= 80 ? "B+" :
         score >= 70 ? "B"  :
         score >= 60 ? "C+" :
         score >= 50 ? "C"  : "D";
}

function categorizeSkills(text: string): { technical: string[]; soft: string[] } {
  const lower = text.toLowerCase();
  const seen  = new Set<string>();

  const technical = TECHNICAL_SKILLS_LIST.filter((s) => {
    if (seen.has(s)) return false;
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found   = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "i").test(lower);
    if (found) seen.add(s);
    return found;
  });

  // Deduplicate substring matches (e.g. "azure" inside "azure ai")
  const deduped = technical.filter(
    (skill) =>
      !technical.some(
        (other) => other !== skill && other.includes(skill) && other.length > skill.length
      )
  );

  const soft = SOFT_SKILLS_LIST.filter((s) => lower.includes(s));
  return { technical: deduped, soft };
}

function detectContactLinks(text: string): {
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  linkedInIsUrlOnly: boolean;
  githubIsUrlOnly: boolean;
} {
  const hasEmail       = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone       = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
  const hasLinkedInUrl = /linkedin\.com\/in\//i.test(text);
  const hasGitHubUrl   = /github\.com\//i.test(text);

  const hasLinkedInIcon =
    !hasLinkedInUrl &&
    (/(?:ï|linkedin|linked in)\s+[A-Za-z]/i.test(text) || /\blinkedin\b/i.test(text));
  const hasGitHubIcon =
    !hasGitHubUrl &&
    (/(?:§|github)\s+[A-Za-z]/i.test(text) || /\bgithub\b/i.test(text));

  return {
    hasEmail,
    hasPhone,
    hasLinkedIn:       hasLinkedInUrl || hasLinkedInIcon,
    hasGitHub:         hasGitHubUrl   || hasGitHubIcon,
    linkedInIsUrlOnly: hasLinkedInUrl,
    githubIsUrlOnly:   hasGitHubUrl,
  };
}

function estimateExperienceMonths(text: string): number {
  const monthNames =
    "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  const dateRangeRe = new RegExp(
    `(${monthNames})\\s+(\\d{4})\\s*[–\\-]\\s*(${monthNames}|Present|Current)\\s*(\\d{4})?`,
    "gi"
  );

  const monthIndex: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
  };

  let totalMonths = 0;
  let match: RegExpExecArray | null;

  while ((match = dateRangeRe.exec(text)) !== null) {
    const startMonth = match[1].slice(0, 3).toLowerCase();
    const startYear  = parseInt(match[2]);
    const endStr     = match[3].toLowerCase();
    const endYear    = match[4] ? parseInt(match[4]) : new Date().getFullYear();
    const startIdx   = monthIndex[startMonth] ?? 0;

    let endIdx: number;
    if (endStr === "present" || endStr === "current") {
      const now = new Date();
      endIdx = now.getMonth() + (now.getFullYear() - startYear) * 12;
    } else {
      endIdx = (monthIndex[endStr.slice(0, 3)] ?? 0) + (endYear - startYear) * 12;
    }
    totalMonths += Math.max(0, endIdx - startIdx);
  }

  return totalMonths;
}

// ─── Core ATS scoring ─────────────────────────────────────────────────────────

function runRuleBasedATS(text: string): RuleBasedResult {
  const lower     = text.toLowerCase();
  const lines     = text.split(/\n/);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const sections: Record<string, ATSSection> = {};

  // ── Contact ──
  const {
    hasEmail, hasPhone,
    hasLinkedIn, hasGitHub,
    linkedInIsUrlOnly, githubIsUrlOnly,
  } = detectContactLinks(text);

  const linkedInScore = hasLinkedIn ? (linkedInIsUrlOnly ? 25 : 12) : 0;
  const githubScore   = hasGitHub   ? (githubIsUrlOnly   ? 25 : 12) : 0;
  const contactScore  = Math.min(100,
    (hasEmail ? 30 : 0) + (hasPhone ? 20 : 0) + linkedInScore + githubScore
  );

  sections.contact = {
    found: hasEmail || hasPhone,
    score: contactScore,
    issues: [
      ...(!hasEmail    ? ["No email address found"] : []),
      ...(!hasPhone    ? ["No phone number found"] : []),
      ...(!hasLinkedIn ? ["LinkedIn profile not detected"] : []),
      ...(hasLinkedIn && !linkedInIsUrlOnly
        ? ["LinkedIn detected as icon only — add full URL: linkedin.com/in/yourname"] : []),
      ...(!hasGitHub   ? ["GitHub profile not detected"] : []),
      ...(hasGitHub && !githubIsUrlOnly
        ? ["GitHub detected as icon only — add full URL: github.com/yourusername"] : []),
    ],
    tips: [
      ...(hasLinkedIn && !linkedInIsUrlOnly
        ? ["Replace icon with plain text URL: linkedin.com/in/yourname"] : []),
      ...(hasGitHub && !githubIsUrlOnly
        ? ["Replace icon with plain text URL: github.com/yourusername"] : []),
      ...(!hasLinkedIn ? ["Add full URL: linkedin.com/in/yourname"] : []),
      ...(!hasGitHub   ? ["Add full URL: github.com/yourusername"] : []),
    ],
  };

  // ── Summary ──
  const hasSummary = SECTION_PATTERNS.summary.test(text);
  sections.summary = {
    found: hasSummary,
    score: hasSummary ? 80 : 20,
    issues: !hasSummary ? ["No professional summary section — ATS ranks this highly"] : [],
    tips:   !hasSummary ? ["Add a 3-line summary: target role + top 2 skills + one achievement"] : [],
  };

  // ── Experience ──
  const hasExperience = SECTION_PATTERNS.experience.test(text);
  const bulletLines   = extractBullets(text);

  const quantifiedBullets = lines.filter((l) => {
    const t = l.trim();
    return (
      t.length > 10 &&
      (/\d+\s*%/.test(t) ||
        /\$[\d,.]+/.test(t) ||
        /\d+[kKmMbB]\b/.test(t) ||
        /\d+\s*\+/.test(t) ||
        /\d+\s*(users|customers|clients|members|engineers|repos|stars|requests|queries|transactions|records|lines|features|endpoints|models|datasets|images|samples|classes|layers|epochs|parameters)/i.test(t) ||
        /\b(zero|0)\s+(breach|downtime|bug|error)/i.test(t))
    );
  });

  const totalExpMonths   = estimateExperienceMonths(text);
  const expDurationBonus =
    totalExpMonths >= 12 ? 20 :
    totalExpMonths >= 6  ? 12 :
    totalExpMonths >= 3  ? 6  : 0;

  const expScore = !hasExperience
    ? 10
    : Math.min(100,
        30 +
        Math.min(quantifiedBullets.length, 5) * 7 +
        expDurationBonus +
        Math.min(bulletLines.length, 5) * 1
      );

  sections.experience = {
    found: hasExperience,
    score: expScore,
    issues: [
      ...(!hasExperience ? ["No experience section detected"] : []),
      ...(quantifiedBullets.length === 0
        ? ["Zero quantified achievements — this is the #1 ATS killer"] : []),
      ...(quantifiedBullets.length > 0 && quantifiedBullets.length < 4 && hasExperience
        ? [`Only ${quantifiedBullets.length} quantified bullet(s) found — aim for at least 5`] : []),
      ...(totalExpMonths > 0 && totalExpMonths < 6 && hasExperience
        ? [`Short experience duration (~${totalExpMonths} month${totalExpMonths === 1 ? "" : "s"}) — supplement with strong project work`] : []),
    ],
    tips: ["Format: [Strong Verb] + [What] + [By How Much] + [Using What tech]"],
  };

  // ── Education ──
  const hasEducation = SECTION_PATTERNS.education.test(text);
  const hasCGPA =
    /(?:cgpa|gpa|grade\s*point)\s*[:\-]?\s*\d[\d.]+/i.test(text) ||
    /\d[\d.]+\s*\/\s*(?:10|4(?:\.0)?)/i.test(text);

  sections.education = {
    found: hasEducation,
    score: hasEducation ? (hasCGPA ? 90 : 70) : 20,
    issues: [
      ...(!hasEducation ? ["No education section found"] : []),
      ...(!hasCGPA && hasEducation ? ["Add your CGPA/GPA — many ATS auto-filter below threshold"] : []),
    ],
    tips: !hasCGPA ? ["Add CGPA if ≥ 7.0/10 or ≥ 3.0/4.0 — ATS filters often require this"] : [],
  };

  // ── Skills ──
  const hasSkills = SECTION_PATTERNS.skills.test(text);
  const { technical: technicalSkills, soft: softSkills } = categorizeSkills(text);
  const presentKeywords = ATS_POWER_KEYWORDS.filter((k) => lower.includes(k));
  const missingKeywords = ATS_POWER_KEYWORDS.filter((k) => !lower.includes(k)).slice(0, 6);

  const skillScore = !hasSkills
    ? 20
    : Math.min(85, 30 + Math.min(technicalSkills.length, 12) * 4);

  sections.skills = {
    found: hasSkills,
    score: skillScore,
    issues: [
      ...(!hasSkills ? ["No dedicated skills section — ATS parsers look for this specifically"] : []),
      ...(technicalSkills.length < 8
        ? [`Only ${technicalSkills.length} technical skills detected — aim for 12+`] : []),
    ],
    tips: !hasSkills ? ["Add a categorized 'Technical Skills' section (Languages | Frameworks | Tools)"] : [],
  };

  // ── Projects ──
  const hasProjects = SECTION_PATTERNS.projects.test(text);
  sections.projects = {
    found: hasProjects,
    score: hasProjects ? 85 : 40,
    issues: !hasProjects ? ["No projects section — critical for students with limited work experience"] : [],
    tips:   !hasProjects ? ["Add 2-3 projects: Name | Tech Stack | Impact metric"] : [],
  };

  // ── Achievements ──
  const hasAchievements = SECTION_PATTERNS.achievements.test(text);
  const hasCerts =
    /certif|azure|aws certified|google certified|coursera|udemy|hackerrank|leetcode|codechef/i.test(text);
  sections.achievements = {
    found: hasAchievements || hasCerts,
    score: hasAchievements || hasCerts ? 85 : 50,
    issues: !hasAchievements && !hasCerts
      ? ["No achievements or certifications section — add hackathon wins, online courses, or certs"] : [],
    tips: [],
  };

  // ── Format issues ──
  const formatIssues: string[] = [];
  if (wordCount < 150)
    formatIssues.push("Resume is very short — under 150 words. Expand experience and project descriptions.");
  if (wordCount > 1000)
    formatIssues.push("Resume may be too long — over 1000 words risks ATS truncation. Aim for 1 page.");
  if (bulletLines.length < 4)
    formatIssues.push("Very few bullet points detected. Use bullet points for all experience and project descriptions.");

  const problematicChars = (text.match(/[^\x00-\x7F]/g) || []).filter(
    (c) => !["ï","§","–","—","•","→","►","▸","✓","©","®","™","é","è","ê","ë","à","â","ü","ö"].includes(c)
  );
  if (problematicChars.length > 15) {
    formatIssues.push(
      `Unusual special characters detected (${[...new Set(problematicChars)].slice(0,5).join(" ")}) — may cause ATS parsing errors.`
    );
  }

  // ── Weak verbs ──
  const foundWeakVerbs = WEAK_VERBS.filter((v) => {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });

  // ── Weighted score ──
  const weights = {
    contact:10, summary:10, experience:35,
    education:15, skills:20, projects:5, achievements:5,
  };
  const totalRuleScore = Math.round(
    Object.entries(weights).reduce(
      (acc, [key, w]) => acc + (sections[key]?.score ?? 0) * w / 100,
      0
    )
  );

  const contentChars   = text.replace(/\s+/g, " ").trim().length;
  const estimatedPages = Math.max(1, Math.round(contentChars / 3000));

  return {
    sections, totalRuleScore, formatIssues,
    missingKeywords, presentKeywords,
    bulletCount: bulletLines.length,
    quantifiedCount: quantifiedBullets.length,
    weakVerbs: foundWeakVerbs,
    wordCount, estimatedPages,
    technicalSkills, softSkills,
  };
}

// ─── Multi-page structured parse (LLM) ───────────────────────────────────────

type ParsedExperience = { title: string; company: string; duration: string };
type ParsedEducation = {
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
};

async function parseStructuredResume(fullText: string): Promise<{
  summary: string;
  experience: ParsedExperience[];
  education: ParsedEducation[];
}> {
  const empty = { summary: "", experience: [], education: [] };
  const excerpt = resumeTextForAI(fullText);

  const prompt = `Parse the FULL resume below (all pages). Return ONLY valid JSON, no markdown:
{"summary":"2-3 sentence professional summary or empty string if none","experience":[{"title":"job title","company":"company","duration":"dates"}],"education":[{"degree":"","institution":"","year":"","gpa":""}]}
Rules:
- Include every role, internship, and project-with-dates from all pages
- Include all degrees/certifications listed
- Use empty arrays if a section is missing

Resume:
${excerpt}`;

  try {
    const raw = await complete(prompt, undefined, 0.1, MODEL_FAST, 1500);
    const parsed = parseJSON<{
      summary?: string;
      experience?: ParsedExperience[];
      education?: ParsedEducation[];
    }>(raw, null);

    if (!parsed) return empty;

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
    };
  } catch (err) {
    console.warn("[resume/upload] structured parse skipped:", err);
    return empty;
  }
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;

    const formData = await req.formData();
    const file     = formData.get("resume") as File | null;

    if (!file || !isPdfUpload(file))
      return NextResponse.json({ error: "Please upload a valid PDF file." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let pagesExtracted = 0;
    let totalPages = 0;
    let extractedText: string;

    try {
      const extracted = await extractTextFromPdfBuffer(fileBuffer, {
        maxPages: MAX_RESUME_PAGES,
      });
      extractedText = extracted.text;
      pagesExtracted = extracted.pagesExtracted;
      totalPages = extracted.totalPages;
      console.log(
        `[resume/upload] PDF: ${pagesExtracted}/${totalPages} page(s), ${extractedText.length} chars`,
      );
    } catch (err) {
      console.error("[resume/upload] PDF extract failed:", err);
      return NextResponse.json(
        {
          error:
            "Could not read this PDF. Use a text-based PDF (not scanned images only).",
        },
        { status: 422 },
      );
    }

    if (extractedText.length < 50)
      return NextResponse.json(
        {
          error:
            "PDF appears empty or image-only. Export your resume as a text-based PDF and try again.",
        },
        { status: 422 },
      );

    const cleanedText = cleanText(extractedText);
    const structured  = await parseStructuredResume(cleanedText);

    const userDir      = ensureUserResumeDir(userId);
    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filepath     = path.join(userDir, safeFilename);
    await fs.writeFile(filepath, fileBuffer);

    // ── Step 1: Rule-based ATS ──
    const rules = runRuleBasedATS(cleanedText);

    const weakBulletExamples = extractBullets(cleanedText)
      .filter((l) => rules.weakVerbs.some((v) => l.toLowerCase().includes(v.toLowerCase())))
      .slice(0, 2)
      .map((l) => l.replace(/^[•\-*▸►✓→◦▪]\s*/, "").trim());

    // ── Step 2: Build gap list ──
    const topGaps: { key: string; issue: string }[] = [];

    if (rules.quantifiedCount < 4)
      topGaps.push({
        key: "quantify",
        issue: `Only ${rules.quantifiedCount} quantified bullet(s). Resume has bullets like: ${weakBulletExamples.slice(0, 2).join(" | ") || "no examples detected"}`,
      });

    if (rules.weakVerbs.length > 0)
      topGaps.push({
        key: "verbs",
        issue: `Weak verbs found: ${rules.weakVerbs.slice(0, 4).join(", ")}`,
      });

    if (!rules.sections.summary.found)
      topGaps.push({ key: "summary", issue: "No professional summary section" });

    if (!rules.sections.projects.found)
      topGaps.push({ key: "projects", issue: "No projects section" });

    if (!rules.sections.achievements.found)
      topGaps.push({ key: "achievements", issue: "No achievements or certifications section" });

    if (rules.missingKeywords.length > 3)
      topGaps.push({
        key: "keywords",
        issue: `Missing ATS keywords: ${rules.missingKeywords.slice(0, 5).join(", ")}`,
      });

    // Exactly one gap per platform — no double-push
    const contactLinks = detectContactLinks(cleanedText);
    if (!contactLinks.hasLinkedIn) {
      topGaps.push({ key: "linkedin", issue: "No LinkedIn profile detected" });
    } else if (!contactLinks.linkedInIsUrlOnly) {
      topGaps.push({
        key: "linkedin",
        issue: "LinkedIn URL missing — only icon/name detected, ATS cannot parse this",
      });
    }
    if (!contactLinks.hasGitHub) {
      topGaps.push({ key: "github", issue: "No GitHub profile detected" });
    } else if (!contactLinks.githubIsUrlOnly) {
      topGaps.push({
        key: "github",
        issue: "GitHub URL missing — only icon/name detected, ATS cannot parse this",
      });
    }

    // ── Step 3: Optional AI fix text ──
    let aiFixes: Record<string, string> = {};
    const gapsToFix = topGaps.slice(0, 3);

    if (gapsToFix.length > 0) {
      try {
        const fixPrompt = `Resume coach. For each gap write a short "how to fix" (2-4 lines, one ✗/✓ example). Return ONLY JSON, no markdown.
Tech stack: ${rules.technicalSkills.slice(0, 6).join(", ")}
Gaps: ${gapsToFix.map((g, i) => `${i + 1}.[${g.key}] ${g.issue}`).join(" | ")}
Return: {"fixes":{"${gapsToFix.map((g) => g.key).join('":"...","')}}":"..."}}
Max 60 words per fix. Use \\n for newlines.`;

        const raw    = await complete(fixPrompt, undefined, 0.1, MODEL_FAST, 350);
        const parsed = parseJSON(raw, null);
        if (parsed?.fixes && typeof parsed.fixes === "object") {
          aiFixes = parsed.fixes;
        }
      } catch (e: any) {
        const reason = e?.status === 429 ? "rate limited" : (e?.message ?? "unknown");
        console.warn(`[resume] AI fix skipped (${reason}) — using rule-based fixes`);
      }
    }

    // ── Step 4: Build improvements as full objects ──
    const RULE_FIXES: Record<string, string> = {
      quantify:     `Use this formula for every bullet:\n[Action Verb] + [What] + [By How Much] + [Tech Used]\n✗ Improved application performance\n✓ Reduced API response time by 40% using Redis caching`,
      verbs:        `Replace weak verbs:\n✗ 'contributed to' → ✓ 'drove' / 'delivered'\n✗ 'worked on' → ✓ 'engineered' / 'built'\n✗ 'used Python' → ✓ 'developed using Python'\nStart every bullet: Built | Engineered | Optimized | Deployed | Led`,
      summary:      `Add a 3-line summary at the top:\n✓ [Role] student at [Uni] with experience in [skill1], [skill2].\n✓ Built [best project] achieving [metric].\n✓ Seeking [role] to apply expertise in [skill1] and [skill2].`,
      projects:     `Add 2-3 projects in this format:\n[Name] | [Tech Stack] | [Link]\n• What it does (1 line)\n• Key metric: users, accuracy, performance\n• Main technical challenge solved`,
      achievements: `Add an Achievements section:\n• Certifications (Azure AI-900, AWS Cloud Practitioner, etc.)\n• Hackathon wins or participations\n• Academic honors / Dean's List\n• Relevant online courses (Coursera, edX)`,
      keywords:     `Add these missing keywords naturally to bullets or skills section:\n${rules.missingKeywords.slice(0,5).join(", ")}\n✓ 'Deployed containerized app using Docker on AWS EC2'\n✓ 'Followed Agile/Scrum methodology in cross-functional team'`,
      linkedin:     `Add your full LinkedIn URL as plain text:\n✓ linkedin.com/in/yourname\nDon't use icons only — ATS parsers read text, not symbols.\nIf it's already on your resume as an icon, replace it with the actual URL.`,
      github:       `Add your full GitHub URL as plain text:\n✓ github.com/yourusername\nATS and recruiters both expect a clickable GitHub link.\nIf it's already on your resume as an icon, replace it with the actual URL.`,
    };

    const priorityMap: Record<string, "critical" | "high" | "medium"> = {
      quantify:"critical", verbs:"critical", summary:"critical",
      projects:"high", achievements:"high", keywords:"medium",
      linkedin:"high", github:"high",
    };
    const titleMap: Record<string, string> = {
      quantify:     "Quantify Your Achievements",
      verbs:        "Replace Weak Action Verbs",
      summary:      "Add Professional Summary",
      projects:     "Add Projects Section",
      achievements: "Add Achievements & Certifications",
      keywords:     "Add Missing ATS Keywords",
      linkedin:     "Add LinkedIn URL",
      github:       "Add GitHub URL",
    };
    const impactMap: Record<string, string> = {
      quantify:"+12-15 points", verbs:"+8-10 points", summary:"+8-12 points",
      projects:"+6-10 points",  achievements:"+4-6 points", keywords:"+5-8 points",
      linkedin:"+5 points",     github:"+5 points",
    };

    // FIX: save full improvement objects (not flat strings)
    const improvements = topGaps.slice(0, 6).map((gap, i) => ({
      priority: priorityMap[gap.key] ?? (i < 2 ? "critical" : i < 4 ? "high" : "medium"),
      title:    titleMap[gap.key]    ?? gap.key,
      issue:    gap.issue,
      fix:      aiFixes[gap.key]     ?? RULE_FIXES[gap.key] ?? gap.issue,
      impact:   impactMap[gap.key]   ?? "+4-6 points",
    }));

    // Extra section issues — exclude linkedin/github to avoid duplication
    const sectionIssues = Object.values(rules.sections)
      .flatMap((s) => s.issues)
      .filter(
        (issue) =>
          !improvements.some((imp) => imp.issue === issue) &&
          !issue.toLowerCase().includes("linkedin") &&
          !issue.toLowerCase().includes("github")
      )
      .slice(0, 2);

    const extraFormatIssues = rules.formatIssues
      .filter((issue) => !improvements.some((imp) => imp.issue === issue))
      .slice(0, 1);

    [...sectionIssues, ...extraFormatIssues].forEach((issue) => {
      if (improvements.length >= 8) return;
      const key =
        issue.toLowerCase().includes("bullet")  ? "quantify" :
        issue.toLowerCase().includes("keyword") ? "keywords" : "keywords";
      improvements.push({
        priority: "medium",
        title:    issue.split(/[—–]/)[0].trim().slice(0, 40),
        issue,
        fix:      RULE_FIXES[key] ?? issue,
        impact:   "+3-5 points",
      });
    });

    // ── Step 5: Final score + derived fields ──
    const atsScore    = Math.min(100, Math.max(0, rules.totalRuleScore));
    const grade       = scoreToGrade(atsScore);
    const passesATS   = atsScore >= 65;

    const sectionScores = {
      contact:    rules.sections.contact.score,
      summary:    rules.sections.summary.score,
      experience: rules.sections.experience.score,
      education:  rules.sections.education.score,
      skills:     rules.sections.skills.score,
      projects:   rules.sections.projects.score,
    };

    const stats = {
      wordCount:       rules.wordCount,
      estimatedPages:  rules.estimatedPages,
      bulletCount:     rules.bulletCount,
      quantifiedCount: rules.quantifiedCount,
      weakVerbs:       rules.weakVerbs,
    };

    const summaryText =
      structured.summary ||
      `ATS Score: ${atsScore}/100 (${grade}). ${
        atsScore >= 75 ? "Strong profile" : atsScore >= 60 ? "Good foundation" : "Needs improvement"
      }. ${improvements.length > 0 ? `Top fix: ${improvements[0].title}.` : "Well-structured resume."}`;

    // ── Step 6: Save to DB ──
    // FIX: save improvements as full JSON objects so GET can restore them perfectly
    // FIX: save all derived fields in metadata so GET doesn't have to recalculate
    await prisma.resume.updateMany({
      where: { userId: userId },
      data: { isActive: 0 },
    });

    const id = randomUUID();
    await prisma.resume.create({
      data: {
        id,
        userId: userId,
        filename: file.name,
        filepath,
        rawText: cleanedText,
        skills: JSON.stringify(rules.technicalSkills),
        keywords: JSON.stringify(rules.presentKeywords),
        strengths: JSON.stringify([]),
        feedback: JSON.stringify(improvements),
        experience: JSON.stringify(structured.experience),
        education: JSON.stringify(structured.education),
        atsScore,
        summary: summaryText,
        isActive: 1,
        metadata: JSON.stringify({
          grade,
          passesATS,
          sectionScores,
          stats,
          softSkills: rules.softSkills,
          missingKeywords: rules.missingKeywords,
          pagesExtracted,
          totalPages,
        }),
      },
    });

    scoreExistingJobs(userId, id).catch(console.error);

    return NextResponse.json({
      success: true,
      resume: {
        id,
        filename: file.name,
        atsScore,
        grade,
        passesATS,
        summary: summaryText,
        technicalSkills:  rules.technicalSkills,
        softSkills:       rules.softSkills,
        skills:           rules.technicalSkills,
        keywords:         rules.presentKeywords,
        missingKeywords:  rules.missingKeywords,
        strengths:        [],
        improvements,
        sectionScores,
        stats,
        experience: structured.experience,
        education:  structured.education,
        pagesExtracted,
        totalPages,
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    console.error("[resume/upload]", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

// ─── Background job scoring ───────────────────────────────────────────────────

async function scoreExistingJobs(userId: string, resumeId: string) {
  try {
    const { rescoreUserJobMatches } = await import("@/lib/jobs/rescore-matches");
    const count = await rescoreUserJobMatches({ userId, resumeId, force: true });
    console.log(`[resume] Background scoring complete (${count} jobs)`);
  } catch (e) {
    console.error("[resume] Background scoring failed:", e);
  }
}