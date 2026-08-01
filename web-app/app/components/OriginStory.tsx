"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, Quote, X } from "lucide-react";
import MicPhoto from "../../public/photos/Mic.jpg";

const LinkedinIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function OriginStory() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Портал работает только на клиенте (после маунта) — иначе document не существует на SSR.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#111827] text-[#fde047] px-10 py-5 rounded-[2rem] font-black uppercase text-lg border-[4px] border-black shadow-[6px_6px_0_#e11d48] hover:-translate-y-1 hover:shadow-[8px_8px_0_#e11d48] transition-all flex items-center gap-3 transform hover:rotate-1 mt-8"
      >
        Read Origin Story <ArrowRight size={20} />
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-[#fafafa] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] md:rounded-[3rem] border-[4px] border-black shadow-[12px_12px_0_#e11d48] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-[#e11d48] hover:text-white transition-colors shadow-[2px_2px_0_#000] z-10"
              aria-label="Close"
            >
              <X size={20} strokeWidth={3} />
            </button>
            <div className="flex flex-col items-center max-w-2xl mx-auto pt-4">
              <Quote className="text-[#e11d48] fill-[#e11d48] w-12 h-12 mb-6 opacity-80" />
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 text-[#111827] leading-none text-center">
                How it all <br /><span className="text-[#e11d48]">Started.</span>
              </h2>
              <div className="space-y-6 text-lg font-medium text-gray-700 border-l-[4px] border-[#fde047] pl-6 w-full text-left">
                <p>A year ago, I randomly sat next to a guy in a crowded local coffee shop. We started talking about startups, our struggles, and the market.</p>
                <p>That conversation turned into a real partnership. Today, we are running an AI engineering agency together and work on major client projects. <span className="text-black font-black bg-[#fde047] px-1">One random conversation changed everything.</span></p>
                <p>But you can’t build a network by waiting for luck - you have to create those opportunities. I realized that the best connections don’t happen at big events with name tags or through cold LinkedIn messages. They happen over good food, with the right people, where conversation actually flows.</p>
                <p>That’s why we built Coconect, to make those kinds of conversations happen more often, and turn them into something real.</p>
              </div>
              <div className="mt-12 flex items-center justify-between bg-white p-4 rounded-2xl border-[3px] border-black w-full shadow-[4px_4px_0_#111827]">
                <div className="flex items-center gap-4">
                  <Image src={MicPhoto} width={56} height={56} placeholder="blur" className="w-14 h-14 rounded-full border-[3px] border-black shadow-[2px_2px_0_#000] object-cover" alt="Mic L. Roman, Co-founder of coconect" />
                  <div className="text-left">
                    <p className="font-black uppercase text-[#111827] text-sm md:text-base">Mic L. Roman</p>
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Co-founder, coconect</p>
                  </div>
                </div>
                <a href="https://www.linkedin.com/in/mikhail-shchegolev/" target="_blank" rel="noopener noreferrer" aria-label="Founder on LinkedIn" className="w-10 h-10 flex items-center justify-center bg-[#0a66c2] text-white rounded-xl border-[2px] border-black shadow-[2px_2px_0_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] transition-all">
                  <LinkedinIcon size={24} />
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
