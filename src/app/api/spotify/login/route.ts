import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
]

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getRedirectUri(request: NextRequest) {
  const callbackUrl = new URL("/api/spotify/callback", request.nextUrl.origin)

  if (callbackUrl.hostname === "localhost") {
    callbackUrl.hostname = "127.0.0.1"
  }

  return process.env.SPOTIFY_REDIRECT_URI || callbackUrl.toString()
}

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found.", { status: 404 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID

  if (!clientId) {
    return Response.json(
      { error: "Missing SPOTIFY_CLIENT_ID server environment variable." },
      { status: 503 }
    )
  }

  const state = crypto.randomUUID()
  const authorizeUrl = new URL(SPOTIFY_AUTH_URL)

  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(request),
    scope: SPOTIFY_SCOPES.join(" "),
    state,
  }).toString()

  const response = NextResponse.redirect(authorizeUrl)

  response.cookies.set("spotify_auth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/spotify",
    sameSite: "lax",
    secure: false,
  })

  return response
}
