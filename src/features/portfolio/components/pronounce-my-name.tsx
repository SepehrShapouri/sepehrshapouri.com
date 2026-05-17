"use client"

import { useEffect, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"

import type { VolumeIconHandle } from "@/components/animated-icons/volume"
import { VolumeIcon } from "@/components/animated-icons/volume"
import { trackEvent } from "@/lib/events"
import { cn } from "@/lib/utils"

function playFromStart(audio: HTMLAudioElement) {
  audio.currentTime = 0
  return audio.play()
}

export function PronounceMyName({
  className,
  namePronunciationUrl,
}: {
  className?: string
  namePronunciationUrl: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const volumeIconRef = useRef<VolumeIconHandle>(null)

  useEffect(() => {
    const audio = new Audio(namePronunciationUrl)
    audio.preload = "auto"
    audioRef.current = audio

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [namePronunciationUrl])

  const handlePlayClick = () => {
    volumeIconRef.current?.startAnimation()

    const audio = audioRef.current ?? new Audio(namePronunciationUrl)
    audioRef.current = audio

    void playFromStart(audio)
      .then(() => {
        trackEvent({
          name: "play_name_pronunciation",
        })
      })
      .catch(() => {
        volumeIconRef.current?.stopAnimation()
      })
  }

  useHotkeys("p", handlePlayClick)

  return (
    <button
      className={cn(
        "relative after:absolute after:-inset-2",
        "touch-manipulation text-muted-foreground transition-[color,scale] select-none hover:text-foreground active:scale-[0.9]",
        className
      )}
      onClick={handlePlayClick}
      aria-label="Pronounce my name"
    >
      <VolumeIcon ref={volumeIconRef} className="size-4.5" />
    </button>
  )
}
