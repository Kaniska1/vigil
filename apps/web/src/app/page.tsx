 import { VigilHero } from "@/components/landing/vigil-hero";
import { VigilFeatures } from "@/components/landing/vigil-features";
import { VigilContact } from "@/components/landing/vigil-contact";
import { VigilFooter } from "@/components/landing/vigil-footer";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0d0e0f] text-white">
      <VigilHero />
      <VigilFeatures />
      <VigilContact />
      <VigilFooter />
    </main>
  );
}