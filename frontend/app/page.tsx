"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PainInvertedSection } from "@/components/landing/PainInvertedSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { InsightModulesSection } from "@/components/landing/InsightModulesSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="dark min-h-screen bg-argus-bg text-argus-text">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <LandingNav />
      <main id="main-content">
        <HeroSection />
        <HowItWorksSection />
        <PainInvertedSection />
        <TrustSection />
        <InsightModulesSection />
      </main>
      <LandingFooter />
    </div>
  );
}
