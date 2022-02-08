import * as i from 'types';


export function convertToGSC(singlePrice: number, amount = 1): Exclude<i.PriceObject, string> {
  const multiPrice = singlePrice * amount;
  const gold = Math.floor(multiPrice / 10000) || 0;
  const silver = Math.floor(multiPrice % 10000 / 100) || 0;
  const copper = multiPrice % 100 || 0;

  return { gold, silver, copper };
}

export function convertToGSCv2(singlePrice: number | undefined = 0, amount = 1): i.PriceObjectV2 {
  const values = convertToGSC(singlePrice ?? 0, amount);

  return {
    ...values,
    raw: singlePrice,
  };
}
