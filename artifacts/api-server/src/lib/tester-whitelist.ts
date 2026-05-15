// Google Play closed testing whitelist — remove or replace after testing.
// Any authenticated user whose email matches an entry here is treated as an
// active Pro member: all free limits, paywalls, and HTTP 429 gates are skipped.
//
// To add a tester:   append their email string to TESTER_EMAILS below.
// To remove a tester: delete their line.
// Comparison is case-insensitive.

const TESTER_EMAILS: string[] = [
  "jesusescamea@gmail.com",
  "unitdownsupport@gmail.com",
  "scornwaup@yahoo.com",
  "pridess04@gmail.com",
  "jasminecornelius22@gmail.com",
  "mzstarlight1988@yahoo.com",
  "genevasittingbear@gmail.com",
  "hannahhcornelius@gmail.com",
  "kcornel22@icloud.com",
  "larajesus418@gmail.com",
  "webb_erik@yahoo.com",
  "john.c.wwm@gmail.com",
];

/**
 * Returns true when the given email belongs to a Google Play closed tester.
 * Safe to call with undefined/empty values — always returns false in that case.
 */
export function isTesterEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return TESTER_EMAILS.some((e) => e.toLowerCase() === normalized);
}
