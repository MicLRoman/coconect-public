import { NextRequest } from "next/server";

const ACTOR = "harvestapi~linkedin-profile-scraper";

// Accepts a full LinkedIn URL or a bare public identifier and normalizes it
// to the "queries" value the actor expects.
function normalize(input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;
    // Full URL → pull the /in/<identifier> slug
    const m = raw.match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    // Otherwise treat as a bare identifier (no spaces, no protocol)
    if (/^[^\s/]+$/.test(raw)) return raw;
    return null;
}

export async function POST(request: NextRequest) {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
        return Response.json(
            { error: "APIFY_TOKEN is not configured on the server." },
            { status: 500 }
        );
    }

    let body: { query?: string };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const query = normalize(body.query ?? "");
    if (!query) {
        return Response.json(
            { error: "Provide a LinkedIn profile URL or public identifier." },
            { status: 400 }
        );
    }

    const apifyUrl =
        `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items` +
        `?token=${encodeURIComponent(token)}`;

    let res: Response;
    try {
        res = await fetch(apifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profileScraperMode: "Profile details no email ($4 per 1k)",
                queries: [query],
            }),
            // The actor runs synchronously; give it room.
            signal: AbortSignal.timeout(180_000),
        });
    } catch {
        return Response.json(
            { error: "Failed to reach the scraping service. Try again." },
            { status: 502 }
        );
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return Response.json(
            { error: `Scraper error (${res.status}).`, detail: text.slice(0, 300) },
            { status: 502 }
        );
    }

    const items = await res.json().catch(() => null);
    const profile = Array.isArray(items) ? items[0] : items;

    // Actor вернул error-item (например, лимит Apify) — показываем реальную причину.
    if (profile && typeof profile.error === "string") {
        return Response.json(
            { error: `Scraper: ${profile.error}` },
            { status: 502 }
        );
    }

    if (!profile || profile.status === 404 || !profile.firstName) {
        return Response.json(
            { error: "Profile not found or is private." },
            { status: 404 }
        );
    }

    return Response.json({ profile });
}
