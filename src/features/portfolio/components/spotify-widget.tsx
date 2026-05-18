"use client"

import { ExternalLinkIcon, Music2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const POLL_INTERVAL_MS = 30_000

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
  const detail =
    track.status === "last-played" && track.playedAt
      ? formatRelativeTime(track.playedAt)
      : null

  return (
    <a
      className={cn(
        "group col-span-full flex min-w-0 items-center gap-3 border border-t-0 p-3 transition-colors hover:bg-muted/60",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      )}
      href={track.spotifyUrl}
      target="_blank"
      rel="noopener"
      aria-label={`${label}: ${track.title} by ${track.artists} on Spotify`}
    >
      <SpotifyArtwork track={track} />

      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[0.6875rem] leading-none text-muted-foreground uppercase">
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
          className="truncate font-mono text-sm leading-5 text-foreground"
          title={`${track.title} by ${track.artists}`}
        >
          {track.title}
          <span className="text-muted-foreground"> by {track.artists}</span>
        </p>
        {detail ? (
          <p className="truncate text-xs leading-5 text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
    </a>
  )
}

function SpotifyArtwork({ track }: { track: SpotifyWidgetTrack }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center border border-line bg-background">
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
    <div
      className={cn(
        "col-span-full flex h-[74px] min-w-0 items-center gap-3 border border-line bg-muted/20 p-3",
        muted && "opacity-70"
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center border border-line bg-background">
        <Music2Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-mono text-[0.6875rem] leading-none text-muted-foreground uppercase">
          Spotify
        </p>
        <p className="truncate font-mono text-sm leading-5 text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()

  if (!Number.isFinite(timestamp)) {
    return "recently"
  }

  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) {
      return formatter.format(Math.round(seconds / unitSeconds), unit)
    }
  }

  return formatter.format(seconds, "second")
}
