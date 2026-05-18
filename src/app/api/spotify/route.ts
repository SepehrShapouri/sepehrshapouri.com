const SPOTIFY_API_URL = "https://api.spotify.com/v1"
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SpotifyImage = {
  height: number | null
  url: string
  width: number | null
}

type SpotifyArtist = {
  name: string
}

type SpotifyTrack = {
  album: {
    images: SpotifyImage[]
    name: string
  }
  artists: SpotifyArtist[]
  duration_ms: number
  external_urls: {
    spotify?: string
  }
  name: string
  type: "track"
}

type CurrentlyPlayingResponse = {
  currently_playing_type?: string
  is_playing?: boolean
  item?: SpotifyTrack | { type?: string } | null
  progress_ms?: number | null
}

type RecentlyPlayedResponse = {
  items?: {
    played_at: string
    track: SpotifyTrack
  }[]
}

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

class SpotifyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string | null
  ) {
    super(message)
  }
}

function getConfig() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
  }
}

function getMissingConfigKeys() {
  const config = getConfig()

  return [
    ["SPOTIFY_CLIENT_ID", config.clientId],
    ["SPOTIFY_CLIENT_SECRET", config.clientSecret],
    ["SPOTIFY_REFRESH_TOKEN", config.refreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

function getBasicAuthHeader() {
  const { clientId, clientSecret } = getConfig()

  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
}

async function getAccessToken() {
  const { refreshToken } = getConfig()
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken || "",
    }),
    cache: "no-store",
  })
  const payload = (await response.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new SpotifyRequestError(
      payload.error_description ||
        payload.error ||
        "Spotify token refresh failed.",
      response.status
    )
  }

  return payload.access_token
}

async function spotifyFetch<T>(path: string, accessToken: string) {
  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (response.status === 204) {
    return null
  }

  if (response.status === 429) {
    throw new SpotifyRequestError(
      "Spotify rate limit exceeded.",
      429,
      response.headers.get("retry-after")
    )
  }

  if (!response.ok) {
    throw new SpotifyRequestError("Spotify request failed.", response.status)
  }

  return (await response.json()) as T
}

function isSpotifyTrack(
  item: CurrentlyPlayingResponse["item"]
): item is SpotifyTrack {
  return Boolean(item && item.type === "track" && "name" in item)
}

function getAlbumImageUrl(track: SpotifyTrack) {
  return (
    track.album.images.find((image) => image.width === 300)?.url ||
    track.album.images[0]?.url ||
    null
  )
}

function toWidgetTrack(
  track: SpotifyTrack,
  status: SpotifyWidgetTrack["status"],
  options: Pick<SpotifyWidgetTrack, "playedAt" | "progressMs"> = {}
): SpotifyWidgetTrack {
  return {
    album: track.album.name,
    albumImageUrl: getAlbumImageUrl(track),
    artists: track.artists.map((artist) => artist.name).join(", "),
    durationMs: track.duration_ms,
    spotifyUrl: track.external_urls.spotify || "https://open.spotify.com",
    status,
    title: track.name,
    ...options,
  }
}

async function getSpotifyWidgetTrack() {
  const accessToken = await getAccessToken()
  const currentlyPlaying = await spotifyFetch<CurrentlyPlayingResponse>(
    "/me/player/currently-playing?additional_types=track",
    accessToken
  )

  if (
    currentlyPlaying?.is_playing &&
    currentlyPlaying.currently_playing_type === "track" &&
    isSpotifyTrack(currentlyPlaying.item)
  ) {
    return toWidgetTrack(currentlyPlaying.item, "playing", {
      progressMs: currentlyPlaying.progress_ms || undefined,
    })
  }

  const recentlyPlayed = await spotifyFetch<RecentlyPlayedResponse>(
    "/me/player/recently-played?limit=1",
    accessToken
  )
  const lastPlayed = recentlyPlayed?.items?.[0]

  if (lastPlayed?.track) {
    return toWidgetTrack(lastPlayed.track, "last-played", {
      playedAt: lastPlayed.played_at,
    })
  }

  return null
}

export async function GET() {
  const missingConfigKeys = getMissingConfigKeys()

  if (missingConfigKeys.length > 0) {
    return Response.json(
      {
        error: `Missing server environment variables: ${missingConfigKeys.join(", ")}`,
        track: null,
        updatedAt: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  try {
    return Response.json(
      {
        track: await getSpotifyWidgetTrack(),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=20, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    if (error instanceof SpotifyRequestError) {
      return Response.json(
        {
          error: error.message,
          track: null,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: error.retryAfter
            ? {
                "Retry-After": error.retryAfter,
              }
            : undefined,
          status: error.status === 429 ? 429 : 502,
        }
      )
    }

    return Response.json(
      {
        error: "Spotify request failed.",
        track: null,
        updatedAt: new Date().toISOString(),
      },
      { status: 502 }
    )
  }
}
