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
- Fullstack developer with 5+ years of experience, known for pixel-perfect execution and strong attention to small details.
- Passionate about exploring new technologies and turning ideas into reality through polished, thoughtfully crafted personal projects.
- Creator of [chanhdai.com](https://github.com/ncdai/chanhdai.com) (1.8k stars), [React Wheel Picker](https://react-wheel-picker.chanhdai.com) (24k+ weekly downloads, ▲Vercel OSS Program), and [ZaDark](https://zadark.com) (80k+ downloads, 30k+ users) — peak metrics.
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
