export * from './state/types';

export type Realm = string | { english: string; russian: string }

export type Realms = {
  eu: {
    english: Realm[];
    russian: Realm[];
  };
  us: string[];
}

export type PageItem = {
  name: string;
  id: string;
}
