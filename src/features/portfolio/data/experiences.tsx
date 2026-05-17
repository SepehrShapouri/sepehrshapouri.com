import { CodeXmlIcon } from "lucide-react"

import type { Experience } from "../types/experiences"

export const EXPERIENCES: Experience[] = [
  {
    id: "codemetrics",
    companyName: "Codemetrics",
    companyLogo:
      "https://assets.sepehrshapouri.com/images/companies/codemetrics.svg",
    companyWebsite: "https://codemetrics.ai",
    positions: [
      {
        id: "1",
        title: "Software Engineer",
        employmentPeriod: {
          start: "2025",
        },
        employmentType: "Contract",
        icon: <CodeXmlIcon />,
        description: `- Building Codemetrics, an engineering analytics platform for measuring AI usage, code quality, developer performance, and DORA metrics across repositories.
- Developing product experiences for AI code review, commit and pull request insights, developer scoring, and team productivity reporting.
- Shipping full-stack features that help engineering teams understand how AI-generated code affects codebases and delivery quality.`,
        skills: [
          "TypeScript",
          "Next.js",
          "React",
          "Supabase",
          "Better Auth",
          "AI",
          "GitHub",
          "DORA Metrics",
        ],
        isExpanded: true,
      },
    ],
  },
  {
    id: "citizenremote",
    companyName: "Citizen Remote",
    companyLogo:
      "https://assets.sepehrshapouri.com/images/companies/citizenremote.svg",
    companyWebsite: "https://citizenremote.com",
    positions: [
      {
        id: "1",
        title: "Software Engineer",
        employmentPeriod: {
          start: "2025",
        },
        employmentType: "Contract",
        icon: <CodeXmlIcon />,
        description: `- Building product experiences for Citizen Remote, a relocation platform helping remote workers with visas, insurance, taxes, accommodation, and destination planning.
- Improving user-facing flows that make global mobility support easier to discover, compare, and act on.
- Shipping polished interfaces for remote workers and digital nomads planning international moves.`,
        skills: [
          "TypeScript",
          "Next.js",
          "React",
          "Product Engineering",
          "UI/UX",
          "Global Mobility",
        ],
      },
    ],
  },
  {
    id: "clawpilot",
    companyName: "Clawpilot",
    companyLogo:
      "https://assets.sepehrshapouri.com/images/companies/clawpilot.png?v=3",
    companyWebsite: "https://clawpilot.ai",
    positions: [
      {
        id: "1",
        title: "Software Engineer",
        employmentPeriod: {
          start: "2026",
        },
        employmentType: "Contract",
        icon: <CodeXmlIcon />,
        description: `- Building product experiences for Clawpilot, a platform that makes OpenClaw available through managed cloud hosting, Slack, and desktop workflows.
- Developing interfaces that reduce setup friction for teams adopting AI agents without local installs or terminal-heavy configuration.
- Shipping AI product flows across onboarding, product selection, and managed OpenClaw usage.`,
        skills: [
          "TypeScript",
          "Next.js",
          "React",
          "AI Agents",
          "Product Engineering",
          "Cloud",
        ],
      },
    ],
  },
  {
    id: "usectrl",
    companyName: "Ctrl",
    companyLogo:
      "https://assets.sepehrshapouri.com/images/companies/usectrl.svg",
    companyWebsite: "https://usectrl.ai",
    positions: [
      {
        id: "1",
        title: "Software Engineer",
        employmentPeriod: {
          start: "2026",
        },
        employmentType: "Contract",
        icon: <CodeXmlIcon />,
        description: `- Building Ctrl, a Mac desktop app that turns meetings and conversations into clear notes, decisions, and actionable tasks.
- Developing product flows for recording, meeting summaries, automatic task extraction, integrations, and work context.
- Shipping privacy-conscious AI workflows that help users move from conversation to follow-through with less manual capture.`,
        skills: [
          "TypeScript",
          "React",
          "macOS",
          "AI",
          "Product Engineering",
          "Task Automation",
        ],
      },
    ],
  },
]
