export function resolveParties(
    direction: string,
    ownerId: string,
    initiatorId: string,
): { payerId: string; payeeId: string } {
    if (direction === "request") {
        return { payerId: ownerId, payeeId: initiatorId };
    }
    return { payerId: initiatorId, payeeId: ownerId };
}
