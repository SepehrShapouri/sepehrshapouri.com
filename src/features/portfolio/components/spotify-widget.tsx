"use client"

import { Music2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const POLL_INTERVAL_MS = 30_000
const WIDGET_CLASSNAME =
  "col-span-full flex min-w-0 items-center gap-3 border border-t-0 border-line p-3"
const ARTWORK_CLASSNAME =
  "flex size-12 shrink-0 items-center justify-center border border-line bg-background"
const STATUS_CLASSNAME =
  "mb-1 flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[0.6875rem] leading-none whitespace-nowrap text-muted-foreground uppercase"
const TITLE_CLASSNAME = "truncate font-mono text-sm leading-5 text-foreground"

type SpotifyWidgetTrack = {
  album: string
  albumImageUrl: string | null
  artists: string
  durationMs: number
  playedAt?: string
  progressMs?: number
  spotifyUrl: string
  status: "playing" | "last-played"
  title: string
}

type SpotifyWidgetResponse = {
  error?: string
  track: SpotifyWidgetTrack | null
  updatedAt: string
}

type FetchStatus = "loading" | "ready" | "error"

export function SpotifyWidget() {
  const [data, setData] = useState<SpotifyWidgetResponse | null>(null)
  const [status, setStatus] = useState<FetchStatus>("loading")

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrack() {
      try {
        const response = await fetch("/api/spotify", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = (await response.json()) as SpotifyWidgetResponse

        if (!response.ok) {
          throw new Error(payload.error || "Spotify request failed.")
        }

        setData(payload)
        setStatus("ready")
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setStatus("error")
      }
    }

    void loadTrack()

    const intervalId = window.setInterval(() => {
      void loadTrack()
    }, POLL_INTERVAL_MS)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  if (status === "loading") {
    return <SpotifyWidgetShell label="Loading Spotify" />
  }

  if (status === "error" || !data?.track) {
    return <SpotifyWidgetShell label="Spotify unavailable" muted />
  }

  const track = data.track
  const label = track.status === "playing" ? "Now playing" : "Last played"

  return (
    <a
      className={cn(
        "group transition-colors hover:bg-muted/60",
        WIDGET_CLASSNAME,
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      )}
      href={track.spotifyUrl}
      target="_blank"
      rel="noopener"
      aria-label={`${label}: ${track.title} by ${track.artists} on Spotify`}
    >
      <SpotifyArtwork track={track} />

      <div className="min-w-0 flex-1">
        <p className={STATUS_CLASSNAME}>
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              track.status === "playing"
                ? "bg-[#1db954]"
                : "bg-muted-foreground/50"
            )}
            aria-hidden
          />
          {label}
          <span className="text-muted-foreground/60">on Spotify</span>
        </p>
        <p
          className={TITLE_CLASSNAME}
          title={`${track.title} by ${track.artists}`}
        >
          {track.title}
          <span className="text-muted-foreground"> by {track.artists}</span>
        </p>
      </div>
    </a>
  )
}

function SpotifyArtwork({ track }: { track: SpotifyWidgetTrack }) {
  return (
    <span className={ARTWORK_CLASSNAME}>
      {track.albumImageUrl ? (
        <img
          src={track.albumImageUrl}
          alt=""
          className="size-full object-contain"
          decoding="async"
          loading="lazy"
        />
      ) : (
        <Music2Icon className="size-5 text-muted-foreground" aria-hidden />
      )}
    </span>
  )
}

function SpotifyWidgetShell({
  label,
  muted = false,
}: {
  label: string
  muted?: boolean
}) {
  return (
    <div className={cn("bg-muted/20", WIDGET_CLASSNAME, muted && "opacity-70")}>
      <span className={ARTWORK_CLASSNAME}>
        <Music2Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={STATUS_CLASSNAME}>
          <span
            className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
            aria-hidden
          />
          Spotify
        </p>
        <p className={cn(TITLE_CLASSNAME, "text-muted-foreground")}>{label}</p>
      </div>
    </div>
  )
}
