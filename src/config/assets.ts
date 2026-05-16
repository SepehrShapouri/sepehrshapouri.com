export const ASSETS_URL = (
  process.env.NEXT_PUBLIC_ASSETS_URL || "https://assets.sepehrshapouri.com"
).replace(/\/$/, "")

export function asset(path: string) {
  return `${ASSETS_URL}${path.startsWith("/") ? path : `/${path}`}`
}
