const FRENCH_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

export function formatFrenchDate(date: Date): string {
    return FRENCH_DATE_FORMAT.format(date);
}

export function formatPointsAmount(amount: number): string {
    const unit = Math.abs(amount) > 1 ? "points" : "point";
    return `${amount} ${unit}`;
}
