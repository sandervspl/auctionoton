import { Date_ISO_8601 } from './general';
import { NexusHub } from './nexushub';

export type PriceObject =
  | string
  | {
      gold: number;
      silver: number;
      copper: number;
    };

export type PriceObjectV2 =
  | string
  | {
      gold: number;
      silver: number;
      copper: number;
      raw: number;
    };

export type PriceSnapshotV2 = {
  marketValue: PriceObjectV2;
  historicalValue: PriceObjectV2;
  minimumBuyout: PriceObjectV2;
  numAuctions: number;
  quantity: number;
};

export type ItemResponseV2 = Omit<NexusHub.ItemsResponse, 'stats'> & {
  uri: string;
  amount: number;
  stats: {
    lastUpdated: Date_ISO_8601;
    current: PriceSnapshotV2;
    previous: PriceSnapshotV2;
  };
};
