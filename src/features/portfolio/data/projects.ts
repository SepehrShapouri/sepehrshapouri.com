import type { Project } from "../types/projects"

export const PROJECTS: Project[] = [
  {
    id: "thepm",
    title: "ThePM",
    isActive: true,
    link: "https://thepm.ai",
    skills: ["AI Agents", "Project Management", "Slack"],
    description:
      "AI project management that turns Slack conversations into organized tasks, with Kanban boards, task ownership, and project summaries.",
    logo: "/images/project-logos/thepm.png",
    logoRounded: true,
  },
  {
    id: "klar",
    title: "Klar",
    isActive: true,
    link: "https://klarbilling.com",
    skills: ["AI", "Medical Billing", "Workflow Automation"],
    description:
      "An AI medical billing platform for managing claims, denials, and underpayments. Brings claim history, team collaboration, and next steps together for billers to review and approve.",
    logo: "/images/project-logos/klar.svg",
    logoInvertOnDark: true,
  },
  {
    id: "chartscribe",
    title: "ChartScribe",
    period: {
      start: "04.2025",
      end: "07.2026",
    },
    link: "https://chartscribe.ai",
    skills: ["AI", "Speech to Text", "Clinical Documentation"],
    description:
      "AI clinical documentation that turns recorded or uploaded visit audio into structured charts, with customizable templates and notes ready to transfer into an EHR.",
    logo: "/images/project-logos/chartscribe.png",
  },
]
