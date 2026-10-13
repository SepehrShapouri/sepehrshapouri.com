"use client"

import { useAtom } from "jotai"
import { useEffect } from "react"

import { cn } from "@/lib/utils"

import { SKATE_GAME_PANEL_ID, skateGameOpenAtom } from "../state/skate-game"

export function ProfileCover() {
  const [isOpen, setIsOpen] = useAtom(skateGameOpenAtom)

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
              src="/sepi-skate/index.html"
              title="Sepi Skate: an interactive pixel skateboard game"
              className="block size-full border-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
