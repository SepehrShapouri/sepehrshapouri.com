export type Project = {
  /** Stable unique identifier (used as list key/anchor). */
  id: string
  title: string
  /** Whether you are currently working on the project. */
  isActive?: boolean
  /**
   * Optional project period, when dates are known.
   * Use "MM.YYYY" format. Omit `end` for ongoing projects.
   */
  period?: {
    /** Start date (e.g., "05.2025"). */
    start: string
    /** End date; leave undefined for "Present". */
    end?: string
  }
  /** Public URL (site, repository, demo, or video). */
  link: string
  /** Tags/technologies for chips or filtering. */
  skills: string[]
  /** Optional rich description; Markdown and line breaks supported. */
  description?: string
  /** Logo image URL (absolute or path under /public). */
  logo?: string
  logoRounded?: boolean
  /** Invert a dark monochrome logo to keep it visible in dark mode. */
  logoInvertOnDark?: boolean
  /** Whether the project card is expanded by default in the UI. */
  isExpanded?: boolean
}
