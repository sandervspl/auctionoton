export namespace NexusHub {
  interface Tooltip {
    label: string;
    format: string;
  }

  interface Current {
    historicalValue: number;
    marketValue: number;
    minBuyout: number;
    numAuctions: number;
    quantity: number;
  }

  interface Previous {
    marketValue: number;
    minBuyout: number;
    quantity: number;
    historicalValue: number;
    numAuctions: number;
  }

  interface Stats {
    lastUpdated: Date_ISO_8601;
    current: Current | null;
    previous: Previous | null;
  }

  export interface ItemsResponse {
    server: string;
    itemId: NumberString;
    name: string;
    uniqueName: string;
    icon: string;
    tags: string[];
    requiredLevel: NumberString;
    itemLevel: NumberString;
    sellPrice: NumberString;
    vendorPrice?: NumberString;
    tooltip: Tooltip[];
    itemLink: string;
    stats: Stats;
  }

  export interface ErrorResponse {
    error: string;
    reason: string;
  }
}

export type Date_ISO_8601 = string;
export type NumberString = string;

export type PriceObject =
  | string
  | {
      gold: NumberString;
      silver: NumberString;
      copper: NumberString;
      raw: NumberString;
    };

export type PriceSnapshot = {
  marketValue: PriceObject;
  historicalValue: PriceObject;
  minimumBuyout: PriceObject;
  numAuctions: NumberString;
  quantity: NumberString;
};

export type ItemResponse = Omit<NexusHub.ItemsResponse, 'stats' | 'tags' | 'tooltip'> & {
  uri: string;
  amount: NumberString;
  stats: {
    lastUpdated: Date_ISO_8601;
    current: PriceSnapshot;
    previous: PriceSnapshot;
  };
  tags: string;
  tooltip: undefined;
};
