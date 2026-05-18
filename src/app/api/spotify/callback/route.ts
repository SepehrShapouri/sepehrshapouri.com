import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SpotifyTokenResponse = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  scope?: string
  expires_in?: number
  error?: string
  error_description?: string
}

function getRedirectUri(request: NextRequest) {
  const callbackUrl = new URL("/api/spotify/callback", request.nextUrl.origin)

  if (callbackUrl.hostname === "localhost") {
    callbackUrl.hostname = "127.0.0.1"
  }

  return process.env.SPOTIFY_REDIRECT_URI || callbackUrl.toString()
}

function getBasicAuthHeader() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function html(body: string, init?: ResponseInit) {
  return new Response(`<!doctype html>${body}`, {
    ...init,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...init?.headers,
    },
  })
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found.", { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const error = searchParams.get("error")

  if (error) {
    return html(`<p>Spotify authorization failed: ${escapeHtml(error)}</p>`, {
      status: 400,
    })
  }

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expectedState = request.cookies.get("spotify_auth_state")?.value

  if (!code) {
    return html("<p>Missing Spotify authorization code.</p>", { status: 400 })
  }

  if (!state || !expectedState || state !== expectedState) {
    return html("<p>Spotify authorization state did not match.</p>", {
      status: 400,
    })
  }

  const authorization = getBasicAuthHeader()

  if (!authorization) {
    return html(
      "<p>Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET server environment variable.</p>",
      { status: 503 }
    )
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(request),
    }),
    cache: "no-store",
  })
  const payload = (await response.json()) as SpotifyTokenResponse

  if (!response.ok || !payload.refresh_token) {
    return html(
      `<p>Spotify token exchange failed: ${escapeHtml(
        payload.error_description || payload.error || response.statusText
      )}</p>`,
      { status: 502 }
    )
  }

  const page = `
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spotify Refresh Token</title>
    <style>
      body {
        background: #0a0a0a;
        color: #fafafa;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        margin: 0;
        padding: 32px;
      }
      main {
        max-width: 760px;
      }
      code {
        background: #171717;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        display: block;
        overflow-wrap: anywhere;
        padding: 16px;
        white-space: pre-wrap;
      }
      p {
        color: #a3a3a3;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Spotify refresh token</h1>
      <p>Add this line to <code>.env.local</code>, then restart the dev server.</p>
      <code>SPOTIFY_REFRESH_TOKEN=${escapeHtml(payload.refresh_token)}</code>
    </main>
  </body>
</html>`

  const nextResponse = new NextResponse(`<!doctype html>${page}`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })

  nextResponse.cookies.delete("spotify_auth_state")

  return nextResponse
}
