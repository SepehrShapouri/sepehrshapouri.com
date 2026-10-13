import { cn } from "@/lib/utils"

export function ProfileCover() {
  return (
    <div
      className={cn(
        "border-x border-line",
        "screen-line-top screen-line-bottom before:-top-px after:-bottom-px"
      )}
    >
      <iframe
        src="/sepi-skate/index.html"
        title="Sepi Skate: an interactive pixel skateboard game"
        className="block h-80 w-full border-0 [@media(pointer:coarse)]:h-100"
      />
    </div>
  )
}
