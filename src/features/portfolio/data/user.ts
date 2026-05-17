import { asset } from "@/config/assets"
import type { User } from "@/features/portfolio/types/user"

export const USER: User = {
  firstName: "Sepehr",
  lastName: "Shapouri",
  displayName: "Sepi",
  username: "sepehrshapouri",
  gender: "male",
  pronouns: "he/him",
  bio: "Code the future. Engineer innovation.",
  flipSentences: [
    "Code the future. Engineer innovation.",
    "Fullstack developer",
    "Open Source Contributor",
  ],
  address: "Fethiye, Oludeniz",
  age: 21,
  phoneNumber: "Kzg0Nzc3ODg4MTQ4", // E.164 format, base64 encoded (https://t.io.vn/base64-string-converter)
  email: "c2VwZWhyc2hhcG91cmlAaWNsb3VkLmNvbQ==", // base64 encoded
  website: "https://sepehrshapouri.com",
  jobTitle: "Fullstack developer",
  jobs: [
    // {
    //   title: "Fullstack developer",
    //   company: "shadcncraft",
    //   website: "https://shadcncraft.com?atp=ncdai",
    //   experienceId: "shadcncraft",
    // },
    // {
    //   title: "Founder",
    //   company: "Quaric",
    //   website: "https://quaric.com",
    //   experienceId: "quaric",
    // },
  ],
  about: `
- Full-stack developer with 5+ years of experience focused on innovation and building products people genuinely love using.
  To me, user experience matters most. As Steve Jobs once said: “Start with the customer experience and work backwards to the technology.”

- I specialize in crafting modern web, desktop, and AI-driven experiences with a strong focus on usability, performance, and design.
  I believe great products come from understanding people first, then engineering the technology around that experience.

- Whether it’s scalable systems, polished interfaces, or AI-powered workflows, I love building products that feel intuitive, seamless, and almost magical to use.

- I’ve worked with startups and businesses to ship production-ready software solutions that improve customer experience, move fast, and drive real business impact.
`,
  avatar: asset("/images/avatar.png"),
  avatarVariants: {
    lightOff: asset("/images/avatar-light-off.png"),
    lightOn: asset("/images/avatar-light-on.png"),
    darkOff: asset("/images/avatar-dark-off.png"),
    darkOn: asset("/images/avatar-dark-on.png"),
  },
  ogImage: asset("/images/og-image.png"),
  namePronunciationUrl: asset("/audio/name-pronunciation.mp3?v=1"),
  timeZone: "Europe/Istanbul",
  keywords: [
    "ncdai",
    "nguyenchanhdai",
    "nguyen chanh dai",
    "chanhdai",
    "chanh dai",
    "iamncdai",
    "quaric",
    "zadark",
    "nguyễn chánh đại",
    "chánh đại",
  ],
  dateCreated: "2023-10-20", // YYYY-MM-DD
}
