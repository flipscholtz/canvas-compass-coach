export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error("Use 3–32 letters, numbers, dots, underscores or hyphens; start with a letter or number.");
  }
  return username;
}

export const accountEmail = (username: string) => `${normalizeUsername(username)}@accounts.canvasstack.local`;
export const accountStorageKey = (id: string) => `canvasstack-account-${id}`;

export function canAccessScenario(ownerId: string | null, accountId: string, demo = false) {
  return demo || ownerId === accountId;
}