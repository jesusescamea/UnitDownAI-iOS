export const Browser = {
  open: async (_opts: { url: string }) => {},
  close: async () => {},
  addListener: (_event: string, _fn: () => void) => ({ remove: () => {} }),
};
