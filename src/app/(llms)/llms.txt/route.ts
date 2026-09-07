import { SITE_INFO } from "@/config/site"
import { getBlogDocs } from "@/features/doc/data/documents"

const allPosts = getBlogDocs()

const content = `# sepehrshapouri.com

> A minimal dev portfolio, shadcn registry, and blog showcasing my work as a software engineer.

- [About](${SITE_INFO.url}/about.md): A quick intro to me, my tech stack, and how to connect.
- [Experience](${SITE_INFO.url}/experience.md): Highlights from my career and key roles I've taken on.

## Blog

${allPosts.map((item) => `- [${item.metadata.title}](${SITE_INFO.url}/blog/${item.slug}.mdx): ${item.metadata.description}`).join("\n")}
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
