import { timingSafeEqual } from "node:crypto"

import type { NextRequest } from "next/server"

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"
const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable"
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CloudflareResponse<T> = {
  success: boolean
  result: T
  errors: { code: number; message: string }[]
  messages: { code?: number; message: string }[]
  result_info?: {
    cursor?: string
    is_truncated?: boolean
    per_page?: number
  }
}

type R2Object = {
  key: string
  size: number
  etag: string
  last_modified: string
  http_metadata?: {
    cacheControl?: string
    contentType?: string
  }
  storage_class?: string
}

function getConfig() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || "sepehr-assets",
    publicUrl:
      process.env.NEXT_PUBLIC_ASSETS_URL || "https://assets.sepehrshapouri.com",
    password: process.env.ASSET_MANAGER_PASSWORD,
  }
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init)
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function assertAuthorized(request: NextRequest) {
  const { password } = getConfig()

  if (!password) {
    return json(
      { error: "Missing ASSET_MANAGER_PASSWORD server environment variable." },
      { status: 503 }
    )
  }

  const providedPassword = request.headers.get("x-asset-manager-password") || ""

  if (!safeEqual(providedPassword, password)) {
    return json({ error: "Unauthorized." }, { status: 401 })
  }
}

function assertCloudflareConfig() {
  const config = getConfig()
  const missing = [
    ["CLOUDFLARE_ACCOUNT_ID", config.accountId],
    ["CLOUDFLARE_API_TOKEN", config.apiToken],
    ["CLOUDFLARE_R2_BUCKET_NAME", config.bucketName],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    return json(
      { error: `Missing server environment variables: ${missing.join(", ")}` },
      { status: 503 }
    )
  }
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/")
}

function publicAssetUrl(key: string) {
  const { publicUrl } = getConfig()
  const normalizedUrl = publicUrl.replace(/\/$/, "")

  return `${normalizedUrl}/${encodeObjectKey(key)}`
}

function normalizePrefix(prefix: string) {
  return prefix.replaceAll("\\", "/").replace(/^\/+/, "")
}

function normalizeKey(key: string) {
  const normalized = normalizePrefix(key).replace(/\/+/g, "/").trim()
  const segments = normalized.split("/")

  if (!normalized || segments.some((segment) => segment === "..")) {
    throw new Error("Use a valid object key.")
  }

  if (normalized.length > 1024) {
    throw new Error("Object key is too long.")
  }

  return normalized
}

function inferContentType(file: File, key: string) {
  if (file.type) {
    return file.type
  }

  const extension = key.split(".").pop()?.toLowerCase()

  switch (extension) {
    case "avif":
      return "image/avif"
    case "css":
      return "text/css"
    case "gif":
      return "image/gif"
    case "html":
      return "text/html"
    case "ico":
      return "image/x-icon"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "js":
    case "mjs":
      return "text/javascript"
    case "json":
      return "application/json"
    case "mp3":
      return "audio/mpeg"
    case "mp4":
      return "video/mp4"
    case "pdf":
      return "application/pdf"
    case "png":
      return "image/png"
    case "svg":
      return "image/svg+xml"
    case "txt":
      return "text/plain"
    case "webm":
      return "video/webm"
    case "webp":
      return "image/webp"
    case "woff":
      return "font/woff"
    case "woff2":
      return "font/woff2"
    case "xml":
      return "application/xml"
    default:
      return "application/octet-stream"
  }
}

async function cloudflareRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<CloudflareResponse<T>> {
  const { apiToken } = getConfig()
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...init.headers,
    },
  })
  const payload = (await response.json()) as CloudflareResponse<T>

  if (!response.ok || !payload.success) {
    const message =
      payload.errors?.map((error) => error.message).join("; ") ||
      "Cloudflare request failed."

    throw new Error(message)
  }

  return payload
}

export async function GET(request: NextRequest) {
  const unauthorized = assertAuthorized(request)

  if (unauthorized) {
    return unauthorized
  }

  const missingConfig = assertCloudflareConfig()

  if (missingConfig) {
    return missingConfig
  }

  const { accountId, bucketName } = getConfig()
  const searchParams = request.nextUrl.searchParams
  const prefix = normalizePrefix(searchParams.get("prefix") || "")
  const cursor = searchParams.get("cursor") || undefined
  const apiSearchParams = new URLSearchParams({
    per_page: "100",
  })

  if (prefix) {
    apiSearchParams.set("prefix", prefix)
  }

  if (cursor) {
    apiSearchParams.set("cursor", cursor)
  }

  try {
    const response = await cloudflareRequest<R2Object[]>(
      `/accounts/${accountId}/r2/buckets/${bucketName}/objects?${apiSearchParams}`
    )

    return json({
      objects: response.result.map((object) => ({
        ...object,
        url: publicAssetUrl(object.key),
      })),
      cursor: response.result_info?.cursor,
      isTruncated: response.result_info?.is_truncated ?? false,
      publicUrl: getConfig().publicUrl,
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = assertAuthorized(request)

  if (unauthorized) {
    return unauthorized
  }

  const missingConfig = assertCloudflareConfig()

  if (missingConfig) {
    return missingConfig
  }

  const { accountId, bucketName } = getConfig()

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return json({ error: "Missing upload file." }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return json({ error: "File is larger than 50 MB." }, { status: 413 })
    }

    const rawKey = String(formData.get("key") || file.name)
    const key = normalizeKey(rawKey)
    const contentType =
      String(formData.get("contentType") || "").trim() ||
      inferContentType(file, key)
    const cacheControl =
      String(formData.get("cacheControl") || "").trim() || DEFAULT_CACHE_CONTROL
    const body = await file.arrayBuffer()

    const response = await cloudflareRequest<{
      etag: string
      key: string
      size: string
      uploaded: string
    }>(
      `/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeObjectKey(key)}`,
      {
        method: "PUT",
        body,
        headers: {
          "Cache-Control": cacheControl,
          "Content-Length": String(file.size),
          "Content-Type": contentType,
        },
      }
    )

    return json({
      object: {
        ...response.result,
        contentType,
        key,
        url: publicAssetUrl(key),
      },
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = assertAuthorized(request)

  if (unauthorized) {
    return unauthorized
  }

  const missingConfig = assertCloudflareConfig()

  if (missingConfig) {
    return missingConfig
  }

  const { accountId, bucketName } = getConfig()

  try {
    const { key: rawKey } = (await request.json()) as { key?: string }
    const key = normalizeKey(rawKey || "")
    const response = await cloudflareRequest<{ key: string }>(
      `/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeObjectKey(key)}`,
      { method: "DELETE" }
    )

    return json({ object: response.result })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 500 }
    )
  }
}
