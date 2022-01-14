import * as i from 'types';

export type ClassicItemPrice = {
  url: string;
  name: {
    slug: string;
    full: string;
  };
  icon: string;
  lastUpdated: string;
  marketValue: i.PriceObject;
  historicalValue: i.PriceObject;
  minimumBuyout: i.PriceObject;
  amount: number;
}

export type RetailItemPrice = {
  lastUpdated: Date;
  quantity: number;
  buyoutPrice: Partial<i.PriceObject>;
  unitPrice: Partial<i.PriceObject>;
  id: number;
}
