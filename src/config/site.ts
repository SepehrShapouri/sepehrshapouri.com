import { USER } from "@/features/portfolio/data/user"
import type { NavItem } from "@/types/nav"

export const SITE_INFO = {
  name: USER.displayName,
  url: process.env.APP_URL || "https://sepehrshapouri.com",
  ogImage: USER.ogImage,
  description: USER.bio,
  keywords: USER.keywords,
}

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}

export const MAIN_NAV: NavItem[] = []

export const MOBILE_NAV: NavItem[] = [
  {
    title: "Home",
    href: "/",
  },
  ...MAIN_NAV,
]

export const X_HANDLE = "@sepehrshapouri"
export const GITHUB_USERNAME = "sepehrshapouri"
export const SOURCE_CODE_GITHUB_REPO = "sepehrshapouri/sepehrshapouri.com"
export const SOURCE_CODE_GITHUB_URL =
  "https://github.com/sepehrshapouri/sepehrshapouri.com"

export const SPONSORSHIP_URL = "https://github.com/sponsors/sepehrshapouri"

export const UTM_PARAMS = {
  utm_source: "sepehrshapouri.com",
}
