import VipLanding from "@/components/VipLanding";
import { Footer } from "@/components/Static";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "VIP",
  description: "Unlock Pick a Peach VIP free: extra photos and clips from every creator, plus members-only creators.",
  path: "/vip",
});

export default function VipPage() {
  return (
    <>
      <div className="wrap">
        <VipLanding />
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
