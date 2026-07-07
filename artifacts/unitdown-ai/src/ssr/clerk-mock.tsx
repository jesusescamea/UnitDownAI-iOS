import React from "react";

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export function useUser() {
  return { user: null, isLoaded: true, isSignedIn: false };
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    getToken: async () => null,
  };
}

export function useClerk() {
  return { signOut: async () => {} };
}

export function useSignIn() {
  return { signIn: null, isLoaded: true };
}

export function useSignUp() {
  return { signUp: null, isLoaded: true };
}

export const SignedIn = ({ children }: { children: React.ReactNode }) => null;
export const SignedOut = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
export const SignIn = () => null;
export const SignUp = () => null;
export const UserButton = () => null;
export const RedirectToSignIn = () => null;

// Sub-path exports (e.g. @clerk/react/internal) used at module level in main.tsx
// are intercepted by the SSR alias which maps @clerk/react → this file.
// The prerender entry-server.tsx doesn't call main.tsx, so this export is only
// a safety net in case any SSR code imports from the internal sub-path.
export function publishableKeyFromHost(
  _hostname: string,
  fallback?: string,
): string {
  return fallback ?? "";
}
