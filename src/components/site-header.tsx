import Link from "next/link"

import { NavDesktop } from "@/components/nav-desktop"
import { SiteMark } from "@/components/site-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { MAIN_NAV } from "@/config/site"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 max-w-screen overflow-x-hidden bg-background px-2 pt-2">
      <div className="screen-line-top screen-line-bottom mx-auto flex h-12 items-center justify-between gap-2 border-x border-line px-2 group-has-data-[slot=layout-wide]/layout:container after:z-1 after:transition-[background-color] sm:gap-4 md:max-w-3xl">
        <Link
          className="transition-[scale] ease-out active:scale-[0.98] [&_svg]:h-8 [&_svg]:shrink-0"
          href="/"
          aria-label="Home"
        >
          <SiteMark />
        </Link>

        <div className="flex-1" />

        <NavDesktop items={MAIN_NAV} />

        <div className="flex items-center *:first:mr-2 max-sm:*:data-[slot=command-menu-trigger]:hidden">
          <Separator
            orientation="vertical"
            className="mx-2 data-vertical:h-4 data-vertical:self-center"
          />
          <ThemeToggle />
        </div>

        <div className="absolute top-[-3.5px] left-[-4.5px] z-2 flex size-2 border border-line bg-background" />
        <div className="absolute top-[-3.5px] right-[-4.5px] z-2 flex size-2 border border-line bg-background" />
      </div>
    </header>
  )
}
