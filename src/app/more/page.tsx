import type { Metadata } from "next";
import MemberProfile from "@/components/MemberProfile";
import { Footer } from "@/components/Static";

export const metadata: Metadata = { title: "Unlocked", robots: { index: false, follow: false } };

export default function MorePage() {
  return (
    <>
      <MemberProfile />
      <Footer />
      <div style={{ height: 88 }} />
    </>
  );
}
