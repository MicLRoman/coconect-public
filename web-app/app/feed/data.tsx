"use client";

import React from 'react';

// Custom LinkedIn Icon
export const LinkedinIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

export const RoleBadge = ({ role, className = "", color = "text-[#e11d48]" }: { role: string, className?: string, color?: string }) => {
  const shortRole = role.split(' ').slice(0, 2).join(' ').substring(0, 14);
  return (
    <div className={`px-2.5 py-1 bg-white border-[2px] border-black rounded-lg shadow-[3px_3px_0_#000] flex items-center justify-center ${className}`}>
      <span className={`font-black uppercase text-[9px] tracking-wide ${color} whitespace-nowrap overflow-hidden text-ellipsis`}>
        {shortRole}
      </span>
    </div>
  );
};

export const MOCK_USER = {
  name: "Alex Builder",
  city: "London, UK",
  avatar: "68",
  tier: "Core Membership", // Starter | Core Membership | Premium
  price: "$29/mo",
  eventsQuota: 2,
  eventsUsed: 1,
  formats: ["Dinners", "Activities", "Quarterly City Meetup"],
  perks: [
    "2 curated experiences per month",
    "Access to social layer",
    "Post-event friend/reconnect system",
    "Priority over free waitlist users",
    "1 quarterly city meetup for top matches"
  ]
};


export const MOCK_UPCOMING = {
  id: 'up1',
  title: 'Curated Dinner',
  date: 'Today',
  time: '19:00',
  restaurant: 'Dishoom Soho',
  address: '22 Kingly St, Carnaby, London',
  table: 'Table 4 (Under Coconect)',
  poolTags: ['CTO', 'Founder', 'Investor', 'Product'],
  desc: 'Your upcoming curated dinner. Get ready to meet your matches!',
  participants: [
    { id: 1, avatar: '11', role: 'CTO' },
    { id: 2, avatar: '5', role: 'Founder' },
    { id: 3, avatar: '33', role: 'Investor' },
    { id: 4, avatar: '12', role: 'Product' }
  ]
};

export const MOCK_EVENTS = [
  {
    id: 'ev1',
    title: 'Curated Dinner',
    date: 'This Saturday',
    time: '19:30',
    type: 'dinner',
    poolTags: ['ML Lead', 'EdTech Founder', 'Senior Product', 'Angel Investor'],
    desc: 'Intimate dinner for founders and top managers. A great opportunity to discuss strategy, fundraising, and just have a good time without the networking cringe.',
    requiredTier: 'Starter'
  },
  {
    id: 'ev2',
    title: 'Padel Match',
    date: 'Next Saturday',
    time: '11:00',
    type: 'sport',
    poolTags: ['Ex-Google', 'SaaS Builder', 'Crypto Trader'],
    desc: 'Active networking on the court. We play 2x2, switch partners, and after the game go grab coffee and discuss projects.',
    requiredTier: 'Core Membership'
  },
  {
    id: 'ev3',
    title: 'Private Founder Brunch',
    date: 'Saturday, Nov 2',
    time: '12:00',
    type: 'brunch',
    poolTags: ['Series A Founder', 'VC Partner', 'Ex-Unicorn'],
    desc: 'High-level brunch for established founders and active investors. Premium tables only.',
    requiredTier: 'Premium'
  }
];

export const MOCK_PASSED_EVENTS = [
  {
    id: 'pe1',
    title: 'Saturday Dinner',
    date: 'Oct 19',
    people: [
      { id: 1, name: 'Stefan', tag: 'IT', avatar: '11' },
      { id: 2, name: 'David', tag: 'DE', avatar: '12' },
      { id: 3, name: 'Vincent', tag: 'DE', avatar: '33' }
    ]
  }
];

export const MOCK_OPEN_CONNECTIONS = [
  {
    id: 'c1',
    name: 'Dmitrii B.',
    role: 'Co-Founder @ Tablr',
    avatar: '15',
    skills: ['React', 'Python', 'Startups'],
    linkedin: '#'
  },
  {
    id: 'c2',
    name: 'Anna G.',
    role: 'Product Marketing Lead',
    avatar: '26',
    skills: ['Go-to-Market', 'B2B SaaS'],
    linkedin: '#'
  }
];
