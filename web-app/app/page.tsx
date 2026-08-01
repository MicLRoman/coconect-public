import type { Metadata } from "next";

import LandingHero from "./components/LandingHero";
import LandingAbout from "./components/LandingAbout";
import HowItWorks from "./components/HowItWorks";
import LandingNetwork from "./components/LandingNetwork";
import LandingPricing from "./components/LandingPricing";
import Navbar from "./components/Navbar";
import OriginStory from "./components/OriginStory";
import StickyCTA from "./components/StickyCTA";
import FaqItem from "./components/FaqItem";
import AnimationPauser from "./components/AnimationPauser";
import { SignupChatProvider, SignupPopup } from "./components/HeroSignupChat";
import { FAQ_ITEMS } from "./constants/faq";

const BASE_URL = "https://www.coconect.io";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "coconect",
      url: BASE_URL,
      logo: `${BASE_URL}/favicon.png`,
      description:
        "We find the people you need, in the places you'll love. Curated dinners and activities that match founders, operators and investors in real life.",
      sameAs: ["https://www.linkedin.com/in/mikhail-shchegolev/"],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "coconect",
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/#faq`,
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function NexusLandingFinal() {
  return (
   <SignupChatProvider>
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-[#e11d48] selection:text-white overflow-x-clip scroll-smooth">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Pause off-screen CSS animations while scrolling (perf). */}
      <AnimationPauser />

      {/* NAVBAR */}
      <Navbar />

      {/* 1. HERO & TICKER SECTION */}
      <LandingHero />

      {/* 2. EXPERIENCES (NETWORK). Мобильный редизайн лежит в LandingNetworkV2 (скрыт, не рендерится). */}
      <LandingNetwork />

      {/* 3. HOW IT WORKS */}
      <HowItWorks />

      {/* 4. ABOUT US */}
      <LandingAbout />

      {/* 5. THIS IS HOW WE MADE IT (STORY CTA) */}
      <section className="bg-[#fafafa] py-24 px-6 relative flex flex-col items-center justify-center overflow-hidden border-b-[4px] border-black">
        <div className="absolute inset-0 opacity-[0.04] z-0" style={{ backgroundImage: 'linear-gradient(#111827 1px, transparent 1px), linear-gradient(90deg, #111827 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto mt-6">
          <div className="relative transform -rotate-2 text-center mb-8 flex flex-col items-center">
            <span className="font-serif italic text-4xl md:text-5xl text-gray-500 block px-4">
              this is how we made it...
            </span>
            <svg width="70" height="70" viewBox="0 0 100 100" className="absolute -bottom-14 -right-4 md:-right-16 opacity-50 text-gray-600 transform rotate-[10deg]">
              <path d="M 10 10 Q 50 10, 60 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6" />
              <path d="M 45 60 L 60 80 L 80 55" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <OriginStory />
        </div>
      </section>

      {/* 6. PRICING */}
      <LandingPricing />

      {/* 7. FAQ SECTION */}
      <section id="faq" className="py-24 bg-[#111827] border-b-[4px] border-black relative z-30 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter mb-12 text-white text-center">
            Got <span className="text-[#38bdf8]">Questions?</span>
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white min-h-[100vh] flex flex-col items-center justify-center relative z-30 px-6 py-12 border-b-[8px] border-black">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-12 text-center">
          <div className="font-black text-black text-7xl md:text-[12rem] tracking-tighter leading-none hover:text-[#e11d48] transition-colors duration-500 cursor-default">
            coconect:
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 font-bold text-black uppercase text-sm md:text-base tracking-widest border-t-[4px] border-black pt-12 w-full max-w-4xl">
            <a href="#about" className="hover:text-[#e11d48] transition-colors hover:-translate-y-1 inline-block">About Us</a>
            <a href="#network" className="hover:text-[#e11d48] transition-colors hover:-translate-y-1 inline-block">Experiences</a>
            <a href="#how-it-works" className="hover:text-[#e11d48] transition-colors hover:-translate-y-1 inline-block">How It Works</a>
            <a href="#pricing" className="hover:text-[#e11d48] transition-colors hover:-translate-y-1 inline-block">Pricing</a>
            <a href="#faq" className="hover:text-[#e11d48] transition-colors hover:-translate-y-1 inline-block">FAQ</a>
          </div>
          <div className="flex items-center justify-center gap-5">
            <a
              href="https://www.linkedin.com/company/coconect-io/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="coconect on LinkedIn"
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-black bg-white text-black shadow-[4px_4px_0_#111827] hover:text-[#e11d48] hover:-translate-y-1 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/coconect.io/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="coconect on Instagram"
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-black bg-white text-black shadow-[4px_4px_0_#111827] hover:text-[#e11d48] hover:-translate-y-1 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] md:text-xs font-bold uppercase tracking-widest text-gray-400 max-w-2xl">
              <a href="/privacy" className="hover:text-[#e11d48] transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-[#e11d48] transition-colors">Terms</a>
              <a href="/community-guidelines" className="hover:text-[#e11d48] transition-colors">Community Guidelines</a>
              <a href="/waiver" className="hover:text-[#e11d48] transition-colors">Waiver</a>
              <a href="/data-deletion" className="hover:text-[#e11d48] transition-colors">Data Deletion</a>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              © 2026 coconect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* STICKY CTA BUTTON */}
      <StickyCTA />

      {/* SIGN UP POPUP (shares chat state with the hero) */}
      <SignupPopup />
    </div>
   </SignupChatProvider>
  );
}
