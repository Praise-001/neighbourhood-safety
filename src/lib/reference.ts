/**
 * Generates an 8-character human-friendly reference code (e.g., "MCR-4821")
 */
export function generateReferenceCode(prefix = "MCR"): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
}
