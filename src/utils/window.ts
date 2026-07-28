export const windowRef = (): Window | null => (
  typeof window !== "undefined" ? window : null
);
