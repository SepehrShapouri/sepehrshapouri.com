"use client"

import {
  CheckIcon,
  CopyIcon,
  FolderIcon,
  Loader2Icon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type AssetObject = {
  key: string
  size: number
  etag: string
  last_modified: string
  url: string
  http_metadata?: {
    cacheControl?: string
    contentType?: string
  }
  storage_class?: string
}

type RequestState = "idle" | "loading" | "success" | "error"

const API_PATH = "/api/asset-manager"
const PASSWORD_STORAGE_KEY = "asset-manager-password"
const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable"

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** unitIndex

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function normalizePath(value: string) {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+/g, "/")
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.")
  }

  return payload as T
}

export function AssetManagerClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState("")
  const [prefix, setPrefix] = useState("")
  const [folder, setFolder] = useState("images")
  const [key, setKey] = useState("")
  const [contentType, setContentType] = useState("")
  const [cacheControl, setCacheControl] = useState(DEFAULT_CACHE_CONTROL)
  const [objects, setObjects] = useState<AssetObject[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [state, setState] = useState<RequestState>("idle")
  const [message, setMessage] = useState("")
  const [copiedUrl, setCopiedUrl] = useState("")

  const headers = useMemo(
    () => ({
      "x-asset-manager-password": password,
    }),
    [password]
  )

  async function loadObjects(nextPrefix = prefix) {
    if (!password) {
      return
    }

    setState("loading")
    setMessage("")

    try {
      const params = new URLSearchParams()
      const normalizedPrefix = normalizePath(nextPrefix)

      if (normalizedPrefix) {
        params.set("prefix", normalizedPrefix)
      }

      const payload = await parseJsonResponse<{ objects: AssetObject[] }>(
        await fetch(`${API_PATH}?${params}`, { headers })
      )

      setObjects(payload.objects)
      setState("success")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not load.")
    }
  }

  useEffect(() => {
    const storedPassword = window.localStorage.getItem(PASSWORD_STORAGE_KEY)

    if (storedPassword) {
      setPassword(storedPassword)
    }
  }, [])

  useEffect(() => {
    if (password) {
      window.localStorage.setItem(PASSWORD_STORAGE_KEY, password)
    }
  }, [password])

  useEffect(() => {
    if (password) {
      void loadObjects()
    }
    // loadObjects is intentionally called only when auth becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedFiles.length === 0) {
      setState("error")
      setMessage("Choose at least one file.")
      return
    }

    setState("loading")
    setMessage("")

    try {
      const uploadedUrls: string[] = []
      const normalizedFolder = normalizePath(folder)
      const normalizedKey = normalizePath(key)

      for (const file of selectedFiles) {
        const formData = new FormData()
        const objectKey =
          selectedFiles.length === 1 && normalizedKey
            ? normalizedKey
            : [normalizedFolder, file.name].filter(Boolean).join("/")

        formData.set("file", file)
        formData.set("key", objectKey)
        formData.set("cacheControl", cacheControl)

        if (contentType && selectedFiles.length === 1) {
          formData.set("contentType", contentType)
        }

        const payload = await parseJsonResponse<{
          object: { url: string }
        }>(
          await fetch(API_PATH, {
            method: "POST",
            body: formData,
            headers,
          })
        )

        uploadedUrls.push(payload.object.url)
      }

      setSelectedFiles([])
      setKey("")

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      await loadObjects()
      setState("success")
      setMessage(uploadedUrls.join("\n"))
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Upload failed.")
    }
  }

  async function handleDelete(objectKey: string) {
    const confirmed = window.confirm(`Delete ${objectKey}?`)

    if (!confirmed) {
      return
    }

    setState("loading")
    setMessage("")

    try {
      await parseJsonResponse(
        await fetch(API_PATH, {
          method: "DELETE",
          body: JSON.stringify({ key: objectKey }),
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        })
      )
      await loadObjects()
      setState("success")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Delete failed.")
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    window.setTimeout(() => setCopiedUrl(""), 1400)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Asset Manager
        </h1>
        <p className="text-sm text-muted-foreground">
          assets.sepehrshapouri.com
        </p>
      </div>

      <form
        className="grid gap-4 rounded-lg border bg-card p-4 shadow-xs md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          void loadObjects()
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="asset-manager-password">Password</Label>
          <Input
            id="asset-manager-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="asset-prefix">Prefix</Label>
          <Input
            id="asset-prefix"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            placeholder="images"
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full gap-2" type="submit">
            {state === "loading" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            Refresh
          </Button>
        </div>
      </form>

      <form
        className="grid gap-4 rounded-lg border bg-card p-4 shadow-xs"
        onSubmit={(event) => void handleUpload(event)}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="asset-files">Files</Label>
            <Input
              ref={fileInputRef}
              id="asset-files"
              type="file"
              multiple
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files || []))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="asset-folder">Folder</Label>
            <Input
              id="asset-folder"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="images"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="asset-key">Key</Label>
            <Input
              id="asset-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="images/avatar.webp"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="asset-content-type">Content Type</Label>
            <Input
              id="asset-content-type"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              placeholder="image/webp"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="asset-cache-control">Cache Control</Label>
            <Input
              id="asset-cache-control"
              value={cacheControl}
              onChange={(event) => setCacheControl(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-h-8 items-center gap-2 text-sm text-muted-foreground">
            <FolderIcon className="size-4" />
            {selectedFiles.length} selected
          </div>
          <Button className="gap-2" type="submit" disabled={!password}>
            {state === "loading" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            Upload
          </Button>
        </div>
      </form>

      {message ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap",
            state === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-3 p-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Objects
          </h2>
          <span className="text-sm text-muted-foreground">
            {objects.length}
          </span>
        </div>
        <Separator />
        <div className="divide-y">
          {objects.map((object) => (
            <div
              key={object.key}
              className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <a
                  className="block truncate text-sm font-medium hover:underline"
                  href={object.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {object.key}
                </a>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatBytes(object.size)}</span>
                  <span>{formatDate(object.last_modified)}</span>
                  {object.http_metadata?.contentType ? (
                    <span>{object.http_metadata.contentType}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="gap-2"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyUrl(object.url)}
                >
                  {copiedUrl === object.url ? <CheckIcon /> : <CopyIcon />}
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void handleDelete(object.key)}
                  aria-label={`Delete ${object.key}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))}
          {objects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No objects
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
