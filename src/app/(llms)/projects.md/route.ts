import { PROJECTS } from "@/features/portfolio/data/projects"

const content = `# Projects

${PROJECTS.map((item) => {
  const status = item.isActive ? "\n\nStatus: Active" : ""
  const period = item.period
    ? `\n\nPeriod: ${item.period.start} - ${item.period.end ?? "Present"}`
    : ""
  const skills = `\n\nSkills: ${item.skills.join(", ")}`
  const description = item.description ? `\n\n${item.description.trim()}` : ""
  return `## ${item.title}\n\nProject URL: ${item.link}${status}${period}${skills}${description}`
}).join("\n\n")}
`

export const revalidate = false
export const dynamic = "force-static"

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown;charset=utf-8",
    },
  })
}
