export namespace NexusHub {
  export interface Tooltip {
    label: string;
    format: string;
  }

  export interface Current {
    historicalValue: number;
    marketValue: number;
    minBuyout: number;
    numAuctions: number;
    quantity: number;
  }

  export interface Previous {
    marketValue: number;
    minBuyout: number;
    quantity: number;
    historicalValue: number;
    numAuctions: number;
  }

  export interface Stats {
    lastUpdated: Date;
    current: Current;
    previous: Previous;
  }

  export interface ItemsResponse {
    server: string;
    itemId: number;
    name: string;
    uniqueName: string;
    icon: string;
    tags: string[];
    requiredLevel: number;
    itemLevel: number;
    sellPrice: number;
    vendorPrice?: number;
    tooltip: Tooltip[];
    itemLink: string;
    stats: Stats;
  }

  export interface ErrorResponse {
    error: string;
    reason: string;
  }
}
