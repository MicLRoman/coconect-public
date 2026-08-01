import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const PlanCard = ({ title, price, subtitle, features, isMain, bgColor, textColor, highlightText }: any) => (
  <div className={`relative border-[4px] border-black rounded-3xl p-6 md:p-8 flex flex-col h-full bg-white transition-transform hover:-translate-y-2 ${isMain ? `shadow-[12px_12px_0_#e11d48] md:scale-105 z-10` : `shadow-[8px_8px_0_#111827] mt-0 md:mt-4`}`}>
    {isMain && highlightText && (
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#e11d48] text-white px-4 py-1 rounded-full border-[3px] border-black font-black uppercase text-sm whitespace-nowrap z-20">
        {highlightText}
      </div>
    )}
    <div className={`mb-6 p-4 border-[3px] border-black rounded-xl ${bgColor} ${textColor}`}>
      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl md:text-5xl font-black">{price}</span>
      </div>
    </div>

    <p className="text-sm font-bold text-gray-600 mb-6 uppercase tracking-widest min-h-[3rem]">
      {subtitle}
    </p>

    <div className="flex-grow space-y-4 mb-8">
      {features.map((feature: string, i: number) => (
        <div key={i} className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#111827] shrink-0 mt-0.5" />
          <span className="font-medium text-gray-800 text-sm md:text-base leading-tight">{feature}</span>
        </div>
      ))}
    </div>

  </div>
);

export default function LandingPricing() {
  // ТЕСТ: всё бесплатно — показываем «Free» вместо цены.
  const FREE = process.env.NEXT_PUBLIC_FREE_MODE === 'true';
  const price = (p: string) => (FREE ? 'Free' : p);
  return (
    <section id="pricing" className="py-24 bg-[#fafafa] border-b-[4px] border-black relative z-30 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 md:mb-20 flex flex-col items-center">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-[#111827]">
            Membership <span className="text-[#38bdf8]">Tiers.</span>
          </h2>
          <p className="text-xl font-medium text-gray-600 max-w-2xl text-left border-l-[4px] border-[#38bdf8] pl-4">
            Choose the level of access that fits your lifestyle. Join curated dinners and activities with people worth meeting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 max-w-6xl mx-auto items-stretch">
          <PlanCard
            title="Starter"
            price="Free"
            subtitle="Perfect for trying Coconect with zero commitment."
            features={[
              "1 curated dinner (first one is free)",
              "Access to the social layer",
              "Ability to stay connected with people you meet",
              "Good way to see if it's worth joining paid plans"
            ]}
            bgColor="bg-gray-100"
            textColor="text-black"
          />

          <PlanCard
            title="Core Membership"
            price={price("$19/mo")}
            subtitle="Our main plan. Consistent access with solid matching."
            features={[
              "1 curated dinner per month",
              "Good matching based on what you're building",
              "Access to the social layer",
              "Priority over free users when filling tables"
            ]}
            isMain={true}
            highlightText="Most popular"
            bgColor="bg-[#111827]"
            textColor="text-white"
          />

          <PlanCard
            title="Premium"
            price={price("$29/mo")}
            subtitle="Best experience with higher quality matching."
            features={[
              "2 curated dinners per month",
              "5x better matching quality",
              "Quarterly private meetups with top members",
              "First access to new formats and features",
              "Highest priority for the best tables"
            ]}
            bgColor="bg-[#38bdf8]"
            textColor="text-black"
          />
        </div>
      </div>
    </section>
  );
}
