export function selectUpcomingEvents<T extends { date: string | number | Date }>(
    events: T[],
    now: number,
    limit = 4,
): T[] {
    return [...events]
        .filter((e) => new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
}

export function selectOpenVotes<T extends { status: string }>(votes: T[], limit = 4): T[] {
    return votes.filter((v) => v.status === "open").slice(0, limit);
}

export function countUpcomingEvents<T extends { date: string | number | Date }>(
    events: T[],
    now: number,
): number {
    return events.filter((e) => new Date(e.date).getTime() >= now).length;
}

export function countOpenVotes<T extends { status: string }>(votes: T[]): number {
    return votes.filter((v) => v.status === "open").length;
}

export function countOpenIncidents<T extends { status: string }>(incidents: T[]): number {
    return incidents.filter((i) => i.status === "open").length;
}
