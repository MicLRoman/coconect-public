"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { API_URL, setUserId, setToken, clearAuth } from "../lib/api";
import { FeedGradient, NavHome, NavNetwork, NavProfile } from "../feed/components/popart";
import { ProfileView } from "../components/ProfileView";
import { ConnectionsView } from "../components/ConnectionsView";
import { BillingView } from "../components/BillingView";
import { Upcoming } from "../feed/events/components/Upcoming";
import { OpenTables } from "../feed/events/components/OpenTables";

const BillingIcon = ({ className }: { active?: boolean; className?: string }) => <CreditCard className={className} />;

type Phase = "loading" | "login" | "sent" | "error" | "ready";
type Tab = "events" | "connections" | "profile" | "billing";

export default function LkDashboard() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>("loading");
    const [errMsg, setErrMsg] = useState("");
    const [uid, setUid] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [phone, setPhone] = useState("");
    const [token, setTok] = useState("");
    const [activeTab, setActiveTab] = useState<Tab>("events");
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [openEvents, setOpenEvents] = useState<any[]>([]);
    const [userTierVal, setUserTierVal] = useState(1);
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);

    useEffect(() => {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) { setPhase("login"); return; }
        setToken(token);  // magic-link токен = сессия
        setTok(token);    // для ссылки на «глубокий» онбординг

        // 1. Fetch profile to get user_id and token verification
        fetch(`${API_URL}/lk/profile?token=${encodeURIComponent(token)}`)
            .then(async (r) => {
                const d = await r.json();
                if (!r.ok) throw new Error(d?.detail || "Invalid link");
                return d.user;
            })
            .then((u) => {
                setUid(u.user_id);
                setUserId(u.user_id);
                setUser(u);
                
                // 2. Fetch events feed to get upcoming events
                fetch(`${API_URL}/events/feed?user_id=${u.user_id}`)
                    .then(res => res.ok ? res.json() : { upcoming_events: [] })
                    .then(data => {
                        const formattedUpcoming = (data.upcoming_events || []).map((ev: any) => ({
                            id: ev.id, title: ev.title, date: ev.event_date, time: ev.start_time, city: ev.city,
                            requiredTier: ev.required_tier, poolTags: ev.pool_tags || [],
                            desc: ev.description, restaurant: ev.restaurant_name, address: ev.address,
                            isRSVPed: ev.is_rsvped || false,
                        }));
                        setUpcomingEvents(formattedUpcoming);

                        // Открытые пулы — их же показываем в ЛК (раньше рендерился только /feed).
                        setOpenEvents((data.open_events || []).map((ev: any) => ({
                            id: ev.id, title: ev.title, date: ev.event_date, time: ev.start_time, city: ev.city,
                            requiredTier: ev.required_tier, poolTags: ev.pool_tags || [],
                            desc: ev.description, restaurant: ev.restaurant_name, address: ev.address,
                            isRSVPed: ev.is_rsvped || false,
                        })));
                        const tierVal: Record<string, number> = { "Starter": 1, "Core Membership": 2, "Premium": 3 };
                        setUserTierVal(tierVal[data.tier] || 1);

                        const formattedHistory = (data.history_events || []).map((ev: any) => ({
                            id: ev.id, title: ev.title, date: ev.event_date, time: ev.start_time, city: ev.city,
                            restaurant: ev.restaurant_name
                        }));
                        setHistoryEvents(formattedHistory);
                        
                        setPhase("ready");
                    })
                    .catch(() => setPhase("ready")); // Fallback if events fail
            })
            .catch((e) => { setErrMsg(e instanceof Error ? e.message : "Error"); setPhase("error"); });
    }, []);

    async function requestLink() {
        if (!phone.trim()) return;
        try {
            await fetch(`${API_URL}/lk/request`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phone.trim() }),
            });
            setPhase("sent");
        } catch { setErrMsg("Failed to send the link."); setPhase("error"); }
    }

    const logout = () => {
        clearAuth();
        setPhase("login");
        router.push('/lk');
    };

    // ---------- non-ready states ----------
    if (phase === "loading") return <Center><Loader2 className="animate-spin text-[#e11d48]" size={40} /></Center>;
    if (phase === "sent") return (
        <Center><div className="w-full max-w-sm text-center z-10 relative">
            <div className="text-5xl mb-4">📲</div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">Check WhatsApp</h1>
            <p className="text-gray-600 font-medium">If we have your number — we sent a sign-in link.</p>
        </div></Center>
    );
    if (phase === "login" || phase === "error" || !user) return (
        <Center><div className="w-full max-w-sm z-10 relative">
            <div className="text-3xl font-black tracking-tighter mb-6">coconect:</div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">Sign in</h1>
            <p className="text-gray-600 font-medium mb-6">{phase === "error" ? errMsg + " " : ""}Enter your phone — we'll send a sign-in link in WhatsApp.</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" type="tel"
                className="w-full bg-white border-[3px] border-black rounded-2xl p-4 font-medium outline-none focus:shadow-[5px_5px_0_#38bdf8] transition-all" />
            <button onClick={requestLink} disabled={!phone.trim()}
                className="mt-5 w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase border-[3px] border-black shadow-[5px_5px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50">
                Send link in WhatsApp
            </button>
        </div></Center>
    );

    // ---------- ready: full dashboard ----------
    const tabs = [
        { key: 'events', icon: NavHome, bg: 'bg-[#fde047]', color: 'text-black' },
        { key: 'connections', icon: NavNetwork, bg: 'bg-[#111827]', color: 'text-white' },
        { key: 'billing', icon: BillingIcon, bg: 'bg-[#e11d48]', color: 'text-white' },
        { key: 'profile', icon: NavProfile, bg: 'bg-white', color: 'text-black' },
    ];

    return (
        <div className="w-full max-w-lg mx-auto bg-[#fafafa] min-h-[100dvh] relative overflow-hidden font-sans">
            <FeedGradient tab={activeTab} />

            <div className="relative z-10 h-full pb-28 pt-14 px-5">
                {activeTab === 'events' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff] mb-6">Overview</h2>
                        {!user.deep_onboarding_completed && token && <StoryBanner onClick={() => router.push(`/lk/story?token=${encodeURIComponent(token)}`)} />}
                        {upcomingEvents.length > 0 && (
                            <div className="space-y-6">
                                {upcomingEvents.map(ev => <Upcoming key={ev.id} event={ev} onClick={() => router.push(`/feed/events/${ev.id}`)} />)}
                            </div>
                        )}
                        {openEvents.length > 0 && (
                            <OpenTables events={openEvents} userTierVal={userTierVal} onSelect={(ev: any) => router.push(`/feed/events/${ev.id}`)} />
                        )}
                        {upcomingEvents.length === 0 && openEvents.length === 0 && (
                            <div className="text-center py-10 font-black uppercase text-sm text-black/50 bg-white/60 border-[3px] border-dashed border-black rounded-[2rem]">
                                No scheduled events
                            </div>
                        )}
                        
                        {historyEvents.length > 0 && (
                            <div className="mt-12">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-black drop-shadow-[1px_1px_0_#fff] mb-4">Past Events</h3>
                                <div className="space-y-4">
                                    {historyEvents.map(ev => (
                                        <div key={ev.id} onClick={() => router.push(`/feed/events/${ev.id}`)} className="bg-[#111827] text-white border-[4px] border-black rounded-[2rem] p-5 shadow-[6px_6px_0_#000] cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] transition-all relative">
                                            <div className="absolute top-0 right-0 bg-[#fde047] text-black text-[10px] font-black uppercase px-3 py-1.5 border-b-[3px] border-l-[3px] border-black rounded-bl-2xl shadow-[-2px_2px_0_#000]">Past</div>
                                            <h4 className="font-black uppercase text-2xl leading-none tracking-tighter mb-2 w-3/4">{ev.title}</h4>
                                            <p className="font-black uppercase text-[10px] text-gray-400 tracking-widest">{ev.date}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'connections' && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <ConnectionsView userId={uid as string} />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <BillingView user={user} uid={uid as string} />
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="animate-in fade-in zoom-in-95 duration-200 space-y-6">
                        {!user.deep_onboarding_completed && token && <StoryBanner onClick={() => router.push(`/lk/story?token=${encodeURIComponent(token)}`)} />}
                        <ProfileView
                            user={user} 
                            onEdit={() => router.push('/feed/profile/edit')} 
                            onLogout={logout} 
                            onManagePlan={() => setActiveTab('billing')} 
                        />
                    </div>
                )}
            </div>

            <div className="fixed bottom-6 left-6 right-6 z-50 pointer-events-none">
                <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md border-[4px] border-black rounded-[2.5rem] p-2 flex justify-between items-center shadow-[8px_8px_0_#000] pointer-events-auto">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key as Tab)}
                                className={`relative flex items-center justify-center w-[23%] h-14 rounded-[2rem] transition-all ${isActive ? `${t.bg} border-[3px] border-black` : 'hover:bg-gray-100'}`}
                            >
                                <div className="relative">
                                    <Icon active={isActive} className={`w-7 h-7 ${isActive ? t.color : 'text-gray-500'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Плашка «допройди глубокий онбординг» — на Overview и Profile, пока deep_onboarding_completed=false.
function StoryBanner({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick}
            className="w-full text-left bg-[#c084fc] border-[4px] border-black rounded-[2rem] p-5 shadow-[6px_6px_0_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] active:translate-y-0 transition-all group">
            <div className="flex items-center gap-4">
                <div className="text-4xl shrink-0 -rotate-6">🎇</div>
                <div className="flex-1 min-w-0">
                    <div className="font-black uppercase tracking-tighter text-black text-lg leading-none">Sharpen your table</div>
                    <p className="text-black/70 font-bold text-xs leading-snug mt-1.5">~2 min. Tell your story and we'll show you a real match you'll actually want to meet.</p>
                </div>
                <div className="shrink-0 w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-[3px_3px_0_#fff]">
                    <ArrowRight size={20} strokeWidth={3} className="text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
            </div>
        </button>
    );
}

function Center({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full max-w-lg mx-auto bg-[#fafafa] min-h-[100dvh] relative overflow-hidden font-sans">
            <FeedGradient tab="events" />
            <div className="absolute inset-0 flex items-center justify-center px-5 font-sans z-10">
                {children}
            </div>
        </div>
    );
}
