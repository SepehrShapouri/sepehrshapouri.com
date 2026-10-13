"use client"

import { useAtom } from "jotai"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { SKATE_GAME_PANEL_ID, skateGameOpenAtom } from "../state/skate-game"

export function ProfileCover() {
  const [isOpen, setIsOpen] = useAtom(skateGameOpenAtom)
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const syncGameTheme = useCallback(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return

    iframeRef.current?.contentWindow?.postMessage(
      { type: "sepi-skate:theme", theme: resolvedTheme },
      window.location.origin
    )
  }, [resolvedTheme])

  useEffect(() => {
    if (isOpen) syncGameTheme()
  }, [isOpen, syncGameTheme])

  useEffect(() => {
    return () => setIsOpen(false)
  }, [setIsOpen])

  return (
    <div
      id={SKATE_GAME_PANEL_ID}
      role="region"
      aria-label="Sepi Skate"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "h-80 border-x border-line bg-background [@media(pointer:coarse)]:h-100",
            "screen-line-top screen-line-bottom before:-top-px after:-bottom-px"
          )}
        >
          {isOpen ? (
            <iframe
              ref={iframeRef}
              src="/sepi-skate/index.html"
              title="Sepi Skate: an interactive pixel skateboard game"
              className="block size-full border-0"
              onLoad={syncGameTheme}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
