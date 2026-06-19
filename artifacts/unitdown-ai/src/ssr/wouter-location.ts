/**
 * SSR-safe replacement for wouter/memory-location.
 *
 * wouter's built-in memoryLocation calls useSyncExternalStore without
 * a getServerSnapshot, which React 18 requires during renderToString.
 * This module provides an identical API but adds the server snapshot so
 * SSR rendering succeeds without warnings or thrown errors.
 */
import { useSyncExternalStore } from "react";

export const memoryLocation = ({
  path = "/",
  static: _staticLocation = false,
}: { path?: string; static?: boolean } = {}) => {
  const currentPath = path;

  // In SSR we never navigate, so subscribe is a no-op.
  const subscribe = (_cb: () => void) => () => {};
  const navigate = () => {};

  // getClientSnapshot and getServerSnapshot both return the fixed path.
  const getSnapshot = () => currentPath;

  const useMemoryLocation = (): [string, typeof navigate] => [
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    navigate,
  ];
  useMemoryLocation.searchHook = (): string =>
    useSyncExternalStore(subscribe, () => "", () => "");

  return {
    hook: useMemoryLocation,
    searchHook: useMemoryLocation.searchHook,
    navigate,
  };
};
