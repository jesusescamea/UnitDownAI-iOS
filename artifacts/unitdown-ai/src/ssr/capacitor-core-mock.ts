export function registerPlugin<T>(_name: string, _impl?: object): T {
  return {} as T;
}

export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => "web",
  isPluginAvailable: (_name: string) => false,
};

export function isNativePlatform() {
  return false;
}
