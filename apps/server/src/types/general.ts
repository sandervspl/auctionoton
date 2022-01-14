import * as i from 'types';


export type PriceObject = string | {
  gold: number;
  silver: number;
  copper: number;
}

export type ItemResponse = {
  id: number;
  url: string;
  name: {
    slug: string;
    full: string;
  },
  icon: string;
  lastUpdated: string;
  marketValue: i.PriceObject;
  historicalValue: i.PriceObject;
  minimumBuyout: i.PriceObject;
  quantity: number;
  amount: number;
}

export type ItemScrapeResponse = Omit<ItemResponse, 'amount' | 'marketValue' | 'historicalValue' | 'minimumBuyout'> & {
  marketValue: number;
  historicalValue: number;
  minimumBuyout: number;
}

export type Factions = 'alliance' | 'horde';

export type FetchError = {
  error: boolean;
  reason: string;
}

export type RaceConditionError = i.FetchError & {
  id: number;
}

export type ItemRequestQuery = {
  fields?: string;
}
