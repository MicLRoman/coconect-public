'use server'

// Incremental lead capture → our own DB (ai-engine /leads/step → Supabase `leads`).
// Called after EACH step of the signup chat so we don't lose people who drop off
// mid-flow. One row per lead (keyed by leadId): the backend upserts it.
//
// (Previously this wrote to Google Sheet via SheetDB. Now it lands in our DB so the
// admin funnel can read it. SHEETDB_URL is no longer used.)

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:8001';

type LeadPatch = {
    leadId: string;
    step: string;
    firstName?: string;
    lastName?: string;
    linkedin?: string;
    phone?: string;
    city?: string;
    variant?: string;   // A/B/C-тест: a | b | c
    source?: string;    // site | wa (wa пишет ai-engine сам)
};

export async function saveLeadStep(lead: LeadPatch): Promise<{ success: boolean }> {
    if (!lead.leadId) return { success: false };

    try {
        const res = await fetch(`${API_URL}/leads/step`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
        });
        if (!res.ok) return { success: false };
        const out = await res.json().catch(() => null);
        return { success: !!(out && out.success) };
    } catch (error) {
        console.error('[saveLeadStep] failed:', error);
        return { success: false };
    }
}
