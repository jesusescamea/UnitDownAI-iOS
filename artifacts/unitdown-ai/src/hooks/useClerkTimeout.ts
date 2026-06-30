import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

export interface ClerkTimeoutResult {
  user: ReturnType<typeof useUser>["user"];
  isLoaded: boolean;
  isSignedIn: ReturnType<typeof useUser>["isSignedIn"];
  timedOut: boolean;
}

/**
 * useClerkTimeout — wraps useUser() with a loading timeout.
 *
 * When Clerk fails to initialise (CDN script blocked, network error,
 * pk_test_ key through the proxy, offline environment) `isLoaded` stays
 * `false` indefinitely.  This hook fires `timedOut = true` after `timeoutMs`
 * milliseconds so callers can render a usable state instead of an
 * infinite spinner.
 *
 * Usage patterns:
 *   Public pages  → treat timedOut as "signed out" and render guest content.
 *   Protected pages → show <ClerkTimeoutFallback> when timedOut && !isLoaded.
 *
 * The timeout is cancelled immediately if Clerk loads normally, so there
 * is zero overhead in healthy environments.
 */
export function useClerkTimeout(timeoutMs = 5_000): ClerkTimeoutResult {
  const { user, isLoaded, isSignedIn } = useUser();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(t);
  }, [isLoaded, timeoutMs]);

  return { user, isLoaded, isSignedIn, timedOut };
}
