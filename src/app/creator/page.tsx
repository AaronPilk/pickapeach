import type { Metadata } from "next";
import Studio from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Creator Studio",
  description: "Creators: build your Pick a Peach profile, add photos and clips, and submit it for review.",
  robots: { index: false, follow: true },
};

export default function CreatorPage() {
  return <Studio />;
}
