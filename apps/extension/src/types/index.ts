export * from '@project/types';

export * from 'hooks/useMemoUser';

export * from './data';
export * from './reactQuery';

export type Realm = string | {
  english: string;
  russian: string;
}

export type Realms = {
  eu: {
    english: Realm[];
    russian: Realm[];
  };
  us: string[];
}

export type PageData = {
  name: string;
  id: number;
}

export interface RetailRealmResult {
  [realmName: string]: {
    connectedRealmId: number;
    realmId: number;
  }
}
