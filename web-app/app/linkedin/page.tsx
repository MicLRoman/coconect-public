"use client";

import React, { useState } from "react";
import {
    Search,
    MapPin,
    Briefcase,
    GraduationCap,
    Sparkles,
    Languages,
    BadgeCheck,
    Loader2,
    ExternalLink,
    Users,
} from "lucide-react";

// ---- Minimal shape of the HarvestAPI profile we render ----
type DatePart = { text?: string };
type Experience = {
    position?: string;
    companyName?: string;
    duration?: string;
    location?: string;
    startDate?: DatePart;
    endDate?: DatePart;
};
type Education = {
    schoolName?: string;
    degree?: string;
    fieldOfStudy?: string;
    period?: string;
};
type Skill = { name?: string };
type Lang = { name?: string; proficiency?: string };
type Profile = {
    firstName?: string;
    lastName?: string;
    headline?: string;
    about?: string;
    photo?: string;
    linkedinUrl?: string;
    verified?: boolean;
    openToWork?: boolean;
    premium?: boolean;
    connectionsCount?: number;
    followerCount?: number;
    topSkills?: string;
    location?: { linkedinText?: string };
    experience?: Experience[];
    education?: Education[];
    skills?: Skill[];
    languages?: Lang[];
};

const POP = ["#fde047", "#fb7185", "#7dd3fc", "#a7f3d0", "#d8b4fe"];

function Box({
    children,
    bg = "#ffffff",
    className = "",
}: {
    children: React.ReactNode;
    bg?: string;
    className?: string;
}) {
    return (
        <div
            className={`border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000] ${className}`}
            style={{ background: bg }}
        >
            {children}
        </div>
    );
}

function SectionTitle({
    icon: Icon,
    children,
}: {
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon size={18} strokeWidth={2.5} />
            <h2 className="text-xs uppercase font-black tracking-widest">{children}</h2>
        </div>
    );
}

export default function LinkedInPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    async function search(e?: React.FormEvent) {
        e?.preventDefault();
        if (!query.trim() || loading) return;
        setLoading(true);
        setError(null);
        setProfile(null);
        try {
            const res = await fetch("/api/linkedin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong.");
            setProfile(data.profile);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error.");
        } finally {
            setLoading(false);
        }
    }

    const fullName = profile
        ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
        : "";

    return (
        <div className="min-h-[100dvh] bg-[#fafafa] font-sans text-[#111827] px-4 py-8 sm:py-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                        LinkedIn → <span className="bg-[#fde047] px-2 border-2 border-black rounded-lg">Profile</span>
                    </h1>
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                        Paste a LinkedIn URL or handle. We pull a clean, structured profile.
                    </p>
                </div>

                {/* Search */}
                <form onSubmit={search} className="flex gap-2 mb-6">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="linkedin.com/in/williamhgates  or  williamhgates"
                        className="flex-1 border-2 border-black rounded-xl px-4 py-3 text-sm font-medium shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-shadow"
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="bg-[#111827] text-white border-2 border-black rounded-xl px-5 py-3 font-black uppercase text-xs tracking-widest shadow-[3px_3px_0_0_#000] active:shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />}
                        {loading ? "…" : "Go"}
                    </button>
                </form>

                {/* Error */}
                {error && (
                    <Box bg="#fb7185" className="p-4 mb-6">
                        <p className="font-bold text-sm">{error}</p>
                    </Box>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <Box className="p-6 mb-6 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-xl bg-gray-200 border-2 border-black" />
                            <div className="flex-1 space-y-2 pt-2">
                                <div className="h-5 bg-gray-200 rounded w-1/2" />
                                <div className="h-3 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/3" />
                            </div>
                        </div>
                    </Box>
                )}

                {/* Profile */}
                {profile && !loading && (
                    <div className="space-y-5">
                        {/* Hero */}
                        <Box bg="#fde047" className="p-6">
                            <div className="flex gap-4 items-start">
                                {profile.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={profile.photo}
                                        alt={fullName}
                                        className="w-24 h-24 rounded-xl border-2 border-black object-cover shadow-[3px_3px_0_0_#000] shrink-0"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-xl border-2 border-black bg-white grid place-items-center text-3xl font-black shadow-[3px_3px_0_0_#000] shrink-0">
                                        {profile.firstName?.[0] ?? "?"}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h2 className="text-2xl font-black leading-tight">{fullName}</h2>
                                        {profile.verified && <BadgeCheck size={20} className="text-sky-600 shrink-0" />}
                                    </div>
                                    {profile.headline && (
                                        <p className="text-sm font-semibold mt-1 leading-snug">{profile.headline}</p>
                                    )}
                                    {profile.location?.linkedinText && (
                                        <p className="flex items-center gap-1 text-xs font-medium mt-2 text-gray-800">
                                            <MapPin size={13} strokeWidth={2.5} />
                                            {profile.location.linkedinText}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Badges + stats */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {profile.openToWork && <Pill bg="#a7f3d0">Open to work</Pill>}
                                {profile.premium && <Pill bg="#d8b4fe">Premium</Pill>}
                                {typeof profile.connectionsCount === "number" && (
                                    <Pill bg="#ffffff">
                                        <Users size={12} strokeWidth={2.5} className="inline -mt-0.5 mr-1" />
                                        {profile.connectionsCount}+ connections
                                    </Pill>
                                )}
                                {typeof profile.followerCount === "number" && (
                                    <Pill bg="#ffffff">{profile.followerCount} followers</Pill>
                                )}
                            </div>

                            {profile.linkedinUrl && (
                                <a
                                    href={profile.linkedinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest mt-4 underline underline-offset-2"
                                >
                                    View on LinkedIn <ExternalLink size={12} strokeWidth={2.5} />
                                </a>
                            )}
                        </Box>

                        {/* About */}
                        {profile.about && (
                            <Box className="p-5">
                                <SectionTitle icon={Sparkles}>About</SectionTitle>
                                <p className="text-sm whitespace-pre-line leading-relaxed text-gray-800">
                                    {profile.about}
                                </p>
                            </Box>
                        )}

                        {/* Experience */}
                        {profile.experience && profile.experience.length > 0 && (
                            <Box className="p-5">
                                <SectionTitle icon={Briefcase}>Experience</SectionTitle>
                                <div className="space-y-4">
                                    {profile.experience.map((x, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div
                                                className="w-3 h-3 mt-1.5 rounded-full border-2 border-black shrink-0"
                                                style={{ background: POP[i % POP.length] }}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm leading-snug">{x.position}</p>
                                                <p className="text-sm font-medium text-gray-700">{x.companyName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {[
                                                        x.startDate?.text,
                                                        x.endDate?.text,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" – ")}
                                                    {x.duration ? ` · ${x.duration}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Box>
                        )}

                        {/* Education */}
                        {profile.education && profile.education.length > 0 && (
                            <Box className="p-5">
                                <SectionTitle icon={GraduationCap}>Education</SectionTitle>
                                <div className="space-y-3">
                                    {profile.education.map((e, i) => (
                                        <div key={i}>
                                            <p className="font-bold text-sm">{e.schoolName}</p>
                                            <p className="text-xs text-gray-600">
                                                {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                                            </p>
                                            {e.period && <p className="text-xs text-gray-400">{e.period}</p>}
                                        </div>
                                    ))}
                                </div>
                            </Box>
                        )}

                        {/* Skills */}
                        {profile.skills && profile.skills.length > 0 && (
                            <Box className="p-5">
                                <SectionTitle icon={Sparkles}>Top skills</SectionTitle>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.slice(0, 24).map((s, i) =>
                                        s.name ? (
                                            <span
                                                key={i}
                                                className="text-xs font-bold border-2 border-black rounded-full px-3 py-1"
                                                style={{ background: POP[i % POP.length] }}
                                            >
                                                {s.name}
                                            </span>
                                        ) : null
                                    )}
                                </div>
                            </Box>
                        )}

                        {/* Languages */}
                        {profile.languages && profile.languages.length > 0 && (
                            <Box className="p-5">
                                <SectionTitle icon={Languages}>Languages</SectionTitle>
                                <div className="space-y-1">
                                    {profile.languages.map((l, i) => (
                                        <p key={i} className="text-sm">
                                            <span className="font-bold">{l.name}</span>
                                            {l.proficiency ? (
                                                <span className="text-gray-500"> — {l.proficiency}</span>
                                            ) : null}
                                        </p>
                                    ))}
                                </div>
                            </Box>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Pill({ children, bg }: { children: React.ReactNode; bg: string }) {
    return (
        <span
            className="text-xs font-bold border-2 border-black rounded-full px-3 py-1"
            style={{ background: bg }}
        >
            {children}
        </span>
    );
}
