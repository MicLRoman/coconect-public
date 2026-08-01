import React from 'react';

export const LinkedinIcon = ({ size = 20, className = "" }) => (
    <svg xmlns= "http://www.w3.org/2000/svg" width = { size } height = { size } viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" className = { className } > <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" > </path><rect x="2" y="9" width="4" height="12"></rect > <circle cx="4" cy = "4" r = "2" > </circle></svg >
);

export const INDUSTRIES = ["IT & Software", "Creative & Design", "Finance & Crypto", "Marketing & PR", "Real Estate", "Healthcare", "EdTech", "Consulting", "E-commerce"];
export { CITIES } from '../constants/cities';
export const LANGUAGES_LIST = ["English", "Russian", "French", "Spanish", "German", "Ukrainian"];

export const SKILLS_MAP = {
    "IT & Software": ["React", "Python", "Architecture", "DevOps", "ML / AI", "Backend", "Mobile Dev"],
    "Creative & Design": ["Figma", "Branding", "3D / Motion", "UX/UI", "Art Direction"],
    "Finance & Crypto": ["Financial Modeling", "VC / Investing", "DeFi", "Smart Contracts", "Trading"],
    "Marketing & PR": ["Go-to-Market", "SEO", "Performance", "B2B SaaS", "PR"],
    "Real Estate": ["Development", "Brokerage", "Investments", "PropTech"],
    "Healthcare": ["HealthTech", "Biotech", "Clinical Research"],
    "EdTech": ["Course Design", "Community", "B2C Sales"],
    "Consulting": ["Strategy", "Operations", "Change Management", "M&A"],
    "E-commerce": ["Supply Chain", "Dropshipping", "CRO", "Retail"]
};