export type { NexusHub } from './nexushub';
export * from './api';
export * from './general';

export * from './data';
export * from './reactQuery';

export type Realm =
  | string
  | {
      english: string;
      russian: string;
    };

export type Realms = {
  eu: {
    english: Realm[];
    russian: Realm[];
  };
  us: string[];
};

export type PageItem = {
  name: string;
  id: number;
};
