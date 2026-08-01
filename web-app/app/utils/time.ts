export function getHoursLeft(dateStr: string, timeStr: string): number {
    if (!dateStr || !timeStr) return 999;
    const eventDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
}

export function formatTimeLeft(hoursLeft: number): string {
    if (hoursLeft < 0) return "Passed";
    if (hoursLeft < 12) return "< 12 hours";
    if (hoursLeft <= 24) return "< 24 hours";
    const days = Math.floor(hoursLeft / 24);
    return `In ${days} days`;
}