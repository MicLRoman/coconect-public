import { NextRequest } from "next/server";

// Search LinkedIn people by name (fuzzy) → return lightweight candidates for the
// "is this you?" picker. Full profile parsing happens later via /api/linkedin
// on the candidate the user confirms. Uses the same HarvestAPI vendor/token.
const ACTOR = "harvestapi~linkedin-profile-search";
const MAX_CANDIDATES = 5;

type RawPosition = { title?: string; companyName?: string; current?: boolean };
type RawItem = {
    id?: string;
    linkedinUrl?: string;
    firstName?: string;
    lastName?: string;
    summary?: string;
    pictureUrl?: string;
    location?: { linkedinText?: string };
    currentPositions?: RawPosition[];
};

type Candidate = {
    id: string;
    name: string;
    headline: string;
    location: string;
    photoUrl: string;
    profileUrl: string;
};

function headlineFrom(item: RawItem): string {
    const cur = (item.currentPositions || []).find((p) => p?.current) || item.currentPositions?.[0];
    if (cur?.title && cur?.companyName) return `${cur.title} @ ${cur.companyName}`;
    if (cur?.title) return cur.title;
    // Fallback: first sentence/line of the summary.
    const s = (item.summary || "").trim().split(/[\n.]/)[0];
    return s.slice(0, 100);
}

function toCandidate(item: RawItem): Candidate | null {
    if (!item || !item.linkedinUrl || !(item.firstName || item.lastName)) return null;
    return {
        id: item.id || item.linkedinUrl,
        name: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
        headline: headlineFrom(item),
        location: item.location?.linkedinText || "",
        photoUrl: item.pictureUrl || "",
        profileUrl: item.linkedinUrl,
    };
}

export async function POST(request: NextRequest) {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
        return Response.json({ error: "APIFY_TOKEN is not configured on the server." }, { status: 500 });
    }

    let body: { name?: string; firstName?: string; lastName?: string };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const name = (body.name ?? `${firstName} ${lastName}`).trim();
    if (name.length < 2) {
        return Response.json({ error: "Provide a name to search." }, { status: 400 });
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
                searchQuery: name,
                // Sharpen the fuzzy search with explicit name filters when provided.
                ...(firstName ? { firstNames: [firstName] } : {}),
                ...(lastName ? { lastNames: [lastName] } : {}),
                profileScraperMode: "Short", // $0.1/search page, no full parse — preview only
                maxItems: MAX_CANDIDATES,
            }),
            signal: AbortSignal.timeout(120_000),
        });
    } catch {
        return Response.json({ error: "Failed to reach the search service. Try again." }, { status: 502 });
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return Response.json(
            { error: `Search error (${res.status}).`, detail: text.slice(0, 300) },
            { status: 502 }
        );
    }

    const items = await res.json().catch(() => null);
    if (!Array.isArray(items)) {
        return Response.json({ error: "Unexpected search response." }, { status: 502 });
    }

    const candidates = items
        .map(toCandidate)
        .filter((c): c is Candidate => c !== null)
        .slice(0, MAX_CANDIDATES);

    return Response.json({ candidates });
}
