export namespace NexusHub {
  export interface Tooltip {
    label: string;
    format: string;
  }

  export interface Current {
    historicalValue: number;
    marketValue: number;
    minBuyout: number;
  }

  export interface Previous {
    marketValue: number;
    minBuyout: number;
    historicalValue: number;
  }

  export interface Stats {
    lastUpdated: Date;
    current: Current | null;
    previous: Previous | null;
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
    vendorPrice: number | null;
    tooltip: Tooltip[];
    itemLink: string;
    stats: Stats;
  }

  export interface ErrorResponse {
    error: string;
    reason: string;
  }
}
