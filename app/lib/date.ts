export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function isSupportActive(supportedUntil: Date): boolean {
  return new Date() < supportedUntil;
}