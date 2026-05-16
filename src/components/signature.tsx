"use client"

import {
  motion,
  type SVGMotionProps,
  type TargetAndTransition,
} from "motion/react"

import { cn } from "@/lib/utils"

const SIGNATURE_TRANSFORM = "translate(205 19) scale(1.45)"

const initialProps: TargetAndTransition = {
  opacity: 0,
  pathLength: 0,
}

const animateProps: TargetAndTransition = {
  opacity: 1,
  pathLength: 1,
}

type RevealPath = {
  d: string
  duration: number
  delay?: number
  ease: "easeInOut" | "easeOut"
  strokeWidth?: number
}

const REVEAL_PATHS: RevealPath[] = [
  {
    d: "M66 49C72 34 94 13 80 4C65 -4 40 8 20 21C7 30 3 40 8 48C14 56 31 57 45 60C59 63 68 68 72 74C77 82 70 91 55 96C34 103 8 100 1 91C-4 84 8 76 30 69C51 63 75 63 99 64",
    duration: 1.75,
    ease: "easeInOut",
    strokeWidth: 3.8,
  },
  {
    d: "M75 76C82 69 94 66 98 71C102 77 94 86 87 88C80 90 79 84 84 79C91 73 101 70 110 67C103 78 93 102 82 120C78 126 74 129 72 129",
    delay: 1.72,
    duration: 0.9,
    ease: "easeOut",
    strokeWidth: 3.8,
  },
  {
    d: "M72 129C82 109 96 85 112 72C122 64 130 66 128 76C126 87 113 98 105 100C98 102 97 98 101 94C109 86 124 80 147 75",
    delay: 2.64,
    duration: 0.82,
    ease: "easeOut",
    strokeWidth: 4.15,
  },
  {
    d: "M148 70C144 78 141 87 143 90C148 94 157 86 162 80",
    delay: 3.46,
    duration: 0.45,
    ease: "easeOut",
    strokeWidth: 4.15,
  },
  {
    d: "M152 66L154 66",
    delay: 3.92,
    duration: 0.12,
    ease: "easeOut",
    strokeWidth: 4.15,
  },
]

export type SignatureProps = SVGMotionProps<SVGSVGElement> & {
  durationScale?: number
}

export function Signature({
  className,
  durationScale = 1,
  onAnimationComplete,
  ...props
}: SignatureProps) {
  const calc = (value: number) => value * durationScale

  return (
    <motion.svg
      viewBox="0 0 646 226"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full overflow-hidden drop-shadow-md", className)}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <g
        className="text-muted-foreground"
        transform={SIGNATURE_TRANSFORM}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.32}
        aria-hidden="true"
      >
        {REVEAL_PATHS.map((path) => (
          <path
            key={path.d}
            d={path.d}
            fill="none"
            strokeWidth={path.strokeWidth ?? 4}
          />
        ))}
      </g>

      <g
        transform={SIGNATURE_TRANSFORM}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {REVEAL_PATHS.map((path, index) => (
          <motion.path
            key={path.d}
            d={path.d}
            fill="none"
            strokeWidth={path.strokeWidth ?? 6}
            initial={initialProps}
            animate={animateProps}
            transition={{
              duration: calc(path.duration),
              ease: path.ease,
              delay: calc(path.delay ?? 0),
              opacity: {
                duration: 0.01,
                delay: calc(path.delay ?? 0),
              },
            }}
            onAnimationComplete={
              index === REVEAL_PATHS.length - 1
                ? onAnimationComplete
                : undefined
            }
          />
        ))}
      </g>
    </motion.svg>
  )
}
