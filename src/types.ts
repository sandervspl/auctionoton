export type ItemData = {
  lastUpdated: string;
  marketValue: ValueObject;
  historicalValue: ValueObject;
  minimumBuyout: ValueObject;
}

export type ValueObject = {
  gold: number;
  silver: number;
  copper: number;
}
