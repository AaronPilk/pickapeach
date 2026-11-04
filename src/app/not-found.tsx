import Link from "next/link";
import { Footer } from "@/components/Static";

export default function NotFound() {
  return (
    <>
      <div className="wrap" style={{ minHeight: "60dvh", display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: "4rem" }}>404</h1>
          <p className="muted" style={{ marginTop: 10 }}>That page wandered off. Plenty of others didn&apos;t.</p>
          <Link href="/" className="btn btn-coral" style={{ marginTop: 20 }}>Back to creators</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
