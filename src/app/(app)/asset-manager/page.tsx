import type { Metadata } from "next"

import { AssetManagerClient } from "./asset-manager-client"

export const metadata: Metadata = {
  title: "Asset Manager",
  robots: {
    follow: false,
    index: false,
  },
}

export default function AssetManagerPage() {
  return <AssetManagerClient />
}
