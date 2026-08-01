export function normalizeLinkedInUrl(input: string): string {
    let clean = input.trim();
    if (!clean) return "";

    // Remove trailing slash and query params
    clean = clean.split('?')[0].replace(/\/$/, '');
    
    // Extract from URL if present
    const match = clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^\/]+)/i);
    if (match && match[1]) {
        return `https://www.linkedin.com/in/${match[1]}`;
    }
    
    // If it doesn't match the URL pattern, assume it's just the username
    return `https://www.linkedin.com/in/${clean}`;
}
