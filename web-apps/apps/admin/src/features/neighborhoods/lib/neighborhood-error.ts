export function isOverlapError(error: Error): boolean {
    return (error as { status?: number }).status === 409;
}
