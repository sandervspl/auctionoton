import type { QueryClient } from '@tanstack/react-query';

export function syncStorageChanges(
  client: QueryClient,
  changes: Record<string, { newValue?: unknown }>,
  area: string,
) {
  if (area !== 'local') return;
  for (const key of ['user', 'ui']) {
    if (key in changes) client.setQueryData(['storage', key], changes[key].newValue ?? null);
  }
}
