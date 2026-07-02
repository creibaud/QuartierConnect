export function formatEventDateTime(
    date: Date,
    language: string,
    dateFormat: Intl.DateTimeFormatOptions,
): string {
    const day = date.toLocaleDateString(language, dateFormat);
    if (date.getHours() === 0 && date.getMinutes() === 0) return day;
    const time = date.toLocaleTimeString(language, {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${day} · ${language.startsWith("fr") ? time.replace(":", "h") : time}`;
}
