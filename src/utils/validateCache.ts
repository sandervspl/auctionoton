import * as i from 'types';

function validateCache(data: i.Cache): boolean {
  const now = new Date().getTime();
  const hour = 3.6e6;

  // If it's less than an hour old
  return now - data.updatedAt < hour;
}

export default validateCache;
