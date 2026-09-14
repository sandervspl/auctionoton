import { z } from 'zod';

const realmSchema = z.object({
  name: z.string().min(1),
  localizedName: z.string(),
  realmId: z.number().int().positive(),
  auctionHouses: z.array(
    z.object({
      auctionHouseId: z.number().int().positive(),
      type: z.string(),
      lastModified: z.number(),
    }),
  ),
});

export type RealmOption = z.infer<typeof realmSchema>;

export function parseRealms(value: unknown): RealmOption[] {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  return z.array(realmSchema).parse(data);
}

export function selectRealm(
  realms: RealmOption[],
  currentName: string,
  stored?: { name: string; auctionHouseId: number },
) {
  return (
    realms.find((realm) => realm.name === currentName)?.name ??
    realms.find(
      (realm) =>
        realm.name === stored?.name &&
        realm.auctionHouses.some((house) => house.auctionHouseId === stored.auctionHouseId),
    )?.name ??
    realms[0]?.name ??
    ''
  );
}
