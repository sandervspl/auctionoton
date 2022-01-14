import { NexusHub } from './nexushub';

export type PriceObjectV2 = string | {
  gold: number;
  silver: number;
  copper: number;
  raw: number;
}

export type ItemResponseV2 = Omit<NexusHub.ItemsResponse, 'stats'> & {
  uri: string;
  amount: number;
  stats: {
    current: {
      marketValue: PriceObjectV2;
      historicalValue: PriceObjectV2;
      minimumBuyout: PriceObjectV2;
    };
    previous: {
      marketValue: PriceObjectV2;
      historicalValue: PriceObjectV2;
      minimumBuyout: PriceObjectV2;
    };
  };
}
