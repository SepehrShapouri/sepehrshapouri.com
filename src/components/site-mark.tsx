export function SiteMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M23.5 8.5C21.6 6.8 19.1 6 16.1 6C11.8 6 9 7.9 9 10.8C9 13.6 11.2 14.9 16.3 15.9C20.8 16.8 23 18.1 23 21.1C23 24.2 20.1 26 15.8 26C12.4 26 9.5 24.9 7.5 22.8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
