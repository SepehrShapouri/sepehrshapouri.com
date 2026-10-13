import localFont from "next/font/local"

const wordmarkFont = localFont({
  src: "../assets/fonts/sepi-wordmark.woff2",
  weight: "700",
  display: "swap",
})

export function SiteWordmark() {
  return (
    <span
      className={`${wordmarkFont.className} inline-block text-[35px] leading-[normal] font-bold tracking-[-2px]`}
      aria-hidden="true"
    >
      sepi
      <span className="mt-[7px] ml-[3px] inline-block align-top text-[12px] tracking-normal">
        ®
      </span>
    </span>
  )
}
