import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { VisualSection } from "./components/VisualSection";
import { PricingSection } from "./components/PricingSection";
import { Footer } from "./components/FooterSection";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-primary-light-green/10">
      <HeroSection />
      <FeaturesSection />
      <VisualSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
