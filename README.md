<div align="center">

<img src="public/assets/logo.png" alt="InternHunt Logo" width="60" />

# InternHunt

**AI-powered internship search, resume analysis, and career tools — built for students.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-intern--hunt--rwr4.vercel.app-black?style=flat-square&logo=vercel)](https://intern-hunt-rwr4.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://intern-hunt-rwr4.vercel.app) · [Features](#features) · [Setup](#getting-started) · [Tech Stack](#tech-stack)

---

![InternHunt Screenshot](public/assets/asset2.jpg)

</div>

## What is InternHunt?

InternHunt is a full-stack web app that helps students find and land internships faster. Upload your resume, get an instant ATS compatibility score, discover matched internships scraped in real-time, generate tailored cover letters, and chat with an AI career advisor — all in one place.

---

## Features

### 🎯 ATS Resume Analyzer
- **Deterministic scoring engine** — same resume always gets the same score (no AI variance)
- Section-by-section breakdown: Contact, Summary, Experience, Education, Skills, Projects
- Detects weak action verbs and suggests strong replacements
- Counts quantified achievements and flags missing ones
- Separates **Technical Skills** from **Soft Skills** automatically
- Expandable improvement cards with before/after examples and point estimates
- Keywords found vs. missing keywords comparison

### 💼 Smart Job Matcher
- Scrapes real internship listings personalized to your resume's skill set
- 0–100% match score per job — keyword-based (free) with optional AI enrichment
- Filters by location type: Remote / Hybrid / On-site
- Save jobs for later, search and filter in real-time
- Scores appear progressively as they compute — no waiting

### ✉️ Cover Letter Generator
- One-click cover letters tailored to each job listing
- Three tones: Professional, Friendly, Bold
- References your actual skills and the company by name
- Stores all generated letters for easy access

### 🤖 AI Chat Assistant
- Powered by Groq (llama-3.3-70b-versatile)
- Knows your resume, skills, and ATS score for personalized advice
- Ask anything: interview prep, salary negotiation, role comparisons
- Streamed responses with full conversation history

### 🔐 Passwordless Auth
- Email OTP login via Better Auth — no passwords to remember
- Session-based auth with secure server-side validation

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Auth** | Better Auth v1.2 (Email OTP) |
| **Database** | SQLite + Drizzle ORM |
| **AI / LLM** | Groq API (llama-3.3-70b, llama-3.1-8b-instant) |
| **PDF Parsing** | pdfjs-dist v5 (client-side, no server upload needed) |
| **Styling** | Tailwind CSS + custom design system |
| **Animations** | Framer Motion |
| **Deployment** | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier works)
- An SMTP provider for OTP emails (Gmail, Resend, etc.)

### Installation

```bash
git clone https://github.com/yourusername/internhunt-web.git
cd internhunt-web
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_SECRET=your_secret_here_min_32_chars

# Email (for OTP)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password

# Groq AI
GROQ_API_KEY=gsk_your_groq_key_here
```

### Run Locally

```bash
# Push database schema
npx drizzle-kit push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in your Vercel project dashboard under **Settings → Environment Variables**.

---

## How the ATS Scoring Works

InternHunt uses a **rule-based scoring engine** — no AI required for the score itself. This means:

- ✅ **Consistent** — same resume = same score every time
- ✅ **Fast** — instant results, no API call needed
- ✅ **Free** — doesn't consume Groq quota

The score is a weighted average across 7 dimensions:

| Section | Weight | What's checked |
|---|---|---|
| Contact | 10% | Email, phone, LinkedIn URL, GitHub URL |
| Summary | 10% | Professional summary section present |
| Experience | 35% | Quantified bullets (%, numbers, scale) |
| Education | 15% | Degree, institution, CGPA/GPA |
| Skills | 20% | Technical skill count, categorization |
| Projects | 5% | Projects section present |
| Achievements | 5% | Certifications, awards, hackathons |

AI (Groq) is called **only once** after scoring — to generate personalized "how to fix" explanations for the top 3 gaps. If rate-limited, the app falls back to pre-written rule-based fixes silently.

---

## Groq Rate Limit Strategy

InternHunt is designed to work within Groq's **free tier** (100k tokens/day):

| Feature | Model | Approx. tokens |
|---|---|---|
| Resume fix explanations | llama-3.1-8b-instant | ~450/upload |
| Job match scoring | llama-3.1-8b-instant | ~80/job (max 15/scrape) |
| Cover letter | llama-3.3-70b-versatile | ~600/letter |
| Chat message | llama-3.3-70b-versatile | ~500/message |

Jobs with <30% keyword overlap are scored purely by keyword matching (zero tokens).

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── resume/upload/    # ATS engine + PDF processing
│   │   ├── jobs/             # Job scraping + match scoring
│   │   ├── cover/generate/   # Cover letter generation
│   │   └── chat/             # Streaming AI chat
│   └── dashboard/
│       ├── resume/           # ATS results UI
│       ├── jobs/             # Job matcher UI
│       ├── cover/            # Cover letters UI
│       └── chat/             # Chat UI
├── lib/
│   ├── groq.ts               # Groq client + model config
│   ├── job-matcher.ts        # Rate-limit aware match scorer
│   └── scraper.ts            # Job board scraper
└── db/
    ├── schema.ts             # Drizzle schema
    └── index.ts              # DB client
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT © 2026 [Lakshya Saxena](https://github.com/SaxenaLakshya)

---

<div align="center">

Built with ❤️ for students who deserve better tools.

**[⭐ Star this repo if it helped you land an internship!](https://github.com/yourusername/internhunt-web)**

</div>
