import * as i from '@project/types';


export function convertToGSC(rawPrice: number, amount = 1): Exclude<i.PriceObject, string> {
  const multiPrice = rawPrice * amount;
  const gold = Math.floor(multiPrice / 10000) || 0;
  const silver = Math.floor(multiPrice % 10000 / 100) || 0;
  const copper = multiPrice % 100 || 0;

  return { gold, silver, copper };
}

export function convertToGSCv2(rawPrice: number | undefined = 0, amount = 1): i.PriceObjectV2 {
  const values = convertToGSC(rawPrice ?? 0, amount);

  return {
    ...values,
    raw: rawPrice,
  };
}
