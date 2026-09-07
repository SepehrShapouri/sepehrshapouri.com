import { format } from "date-fns"

import { SITE_INFO } from "@/config/site"
import { getBlogDocs } from "@/features/doc/data/documents"
import { getLLMText } from "@/features/doc/lib/get-llm-text"
import { EXPERIENCES } from "@/features/portfolio/data/experiences"
import { SOCIAL_LINKS } from "@/features/portfolio/data/social-links"
import { TECH_STACK } from "@/features/portfolio/data/tech-stack"
import { USER } from "@/features/portfolio/data/user"

const allPosts = getBlogDocs()

const aboutText = `## About

${USER.about.trim()}

### Personal Information

- First Name: ${USER.firstName}
- Last Name: ${USER.lastName}
- Display Name: ${USER.displayName}
- Location: ${USER.address}
- Website: ${USER.website}

### Social Links

${SOCIAL_LINKS.map((item) => `- [${item.title}](${item.href})`).join("\n")}

### Tech Stack

${TECH_STACK.map((item) => `- [${item.title}](${item.href})`).join("\n")}\n`

const experienceText = `## Experience

${EXPERIENCES.map((item) =>
  item.positions
    .map((position) => {
      const skills = position.skills?.map((skill) => skill).join(", ") || "N/A"
      return `### ${position.title} | ${item.companyName}\n\nDuration: ${position.employmentPeriod.start} - ${position.employmentPeriod.end || "Present"}\n\nSkills: ${skills}\n\n${position.description?.trim()}`
    })
    .join("\n\n")
).join("\n\n")}
`

async function getBlogContent() {
  const text = await Promise.all(
    allPosts.map(
      async (item) =>
        `---\ntitle: "${item.metadata.title}"\ndescription: "${item.metadata.description}"\nlast_updated: "${format(new Date(item.metadata.updatedAt), "MMMM d, yyyy")}"\nsource: "${SITE_INFO.url}/blog/${item.slug}"\n---\n\n${await getLLMText(item)}`
    )
  )
  return text.join("\n\n")
}

async function getContent() {
  return `<SYSTEM>This document contains information about ${USER.displayName}'s professional profile, work experience, and published component documentation. It is formatted for consumption by Large Language Models (LLMs).</SYSTEM>

# sepehrshapouri.com

> A minimal dev portfolio, shadcn registry, and blog showcasing my work as a software engineer.

${aboutText}
${experienceText}

## Blog

${await getBlogContent()}`
}

export const revalidate = false
export const dynamic = "force-static"

export async function GET() {
  return new Response(await getContent(), {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
    },
  })
}
