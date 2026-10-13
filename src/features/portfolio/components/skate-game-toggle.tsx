"use client"

import { useAtom } from "jotai"
import { PlayIcon, XIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

import { SKATE_GAME_PANEL_ID, skateGameOpenAtom } from "../state/skate-game"

export function SkateGameToggle() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useAtom(skateGameOpenAtom)

  if (pathname !== "/") return null

  const toggleGame = () => {
    setIsOpen((open) => !open)

    if (!isOpen) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 border-none px-2 text-xs text-muted-foreground aria-expanded:bg-transparent"
      aria-label={isOpen ? "Close game" : "Game of skate?"}
      aria-expanded={isOpen}
      aria-controls={SKATE_GAME_PANEL_ID}
      onClick={toggleGame}
    >
      {isOpen ? (
        <XIcon className="size-3.5" aria-hidden="true" />
      ) : (
        <PlayIcon className="size-3.5" aria-hidden="true" />
      )}
      {isOpen ? "Close" : "Game of skate?"}
    </Button>
  )
}
