export function ChanhDaiMark(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 256 256" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="
          M48 0H208V48H48V0Z
          M0 48H48V96H0V48Z
          M48 96H208V144H48V96Z
          M208 144H256V208H208V144Z
          M48 208H208V256H48V208Z
          M0 192H48V256H0V192Z
        "
      />
    </svg>
  )
}

export function getMarkSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 256 256"><path fill="currentColor" d="M48 0H208V48H48V0Z M0 48H48V96H0V48Z M48 96H208V144H48V96Z M208 144H256V208H208V144Z M48 208H208V256H48V208Z M0 192H48V256H0V192Z"/></svg>`
}
