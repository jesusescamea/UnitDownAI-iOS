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
