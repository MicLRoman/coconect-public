"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export default function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-[3px] border-black rounded-2xl bg-white overflow-hidden shadow-[6px_6px_0_#000] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left font-black text-lg md:text-xl text-[#111827] uppercase focus:outline-none"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <div
          className={`w-8 h-8 rounded-full border-[2px] border-black flex items-center justify-center transition-transform duration-300 shrink-0 ml-4 ${
            isOpen ? "bg-[#e11d48] text-white rotate-180" : "bg-[#fde047] text-black"
          }`}
        >
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <div
        className={`px-5 md:px-6 transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[500px] pb-6 opacity-100" : "max-h-0 pb-0 opacity-0 overflow-hidden"
        }`}
      >
        <p className="text-gray-600 font-medium text-sm md:text-base border-l-[3px] border-[#e11d48] pl-4">
          {answer}
        </p>
      </div>
    </div>
  );
}
