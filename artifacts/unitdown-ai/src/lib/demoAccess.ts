const DEMO_PRO_EMAILS = [
  "unitdownsupport@gmail.com",
  "review@unitdown.org",
];

export function isDemoProEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return DEMO_PRO_EMAILS.some((e) => e === normalized);
}
