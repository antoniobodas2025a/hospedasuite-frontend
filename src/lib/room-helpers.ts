/**
 * 🛏️ Room formatting helpers
 *
 * Shared utilities for room display across OTA and dashboard.
 */

export function formatBedType(
  bedType: string | undefined,
  beds: number,
  compact: boolean = false
): string {
  if (!bedType) return compact ? `${beds}` : `${beds} Cama${beds > 1 ? 's' : ''}`;

  const labels: Record<string, string> = compact
    ? {
        individual: `${beds} Ind.`,
        doble: `${beds} Doble`,
        queen: `${beds} Queen`,
        king: `${beds} King`,
        litera: `${beds} Litera`,
      }
    : {
        individual: `${beds} Cama Individual`,
        doble: `${beds} Cama Doble`,
        queen: `${beds} Cama Queen`,
        king: `${beds} Cama King`,
        litera: `${beds} Litera${beds > 1 ? 's' : ''}`,
      };

  // Handle composite types like "King + Sofá cama", "2 Queen + 2 Individual"
  if (bedType.includes('+') || bedType.includes(',')) return bedType;
  return labels[bedType.toLowerCase()] || bedType;
}
