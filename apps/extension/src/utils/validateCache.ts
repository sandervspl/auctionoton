import * as i from 'types';
import time from './time';


function validateCache(data: i.AnyCachedItem | undefined): data is i.AnyCachedItem {
  if (!data) {
    return false;
  }

  const now = new Date().getTime();
  const diff = __DEV__ ? time.seconds(10) : time.hours(1);

  // Valid if less than diff old
  return now - data.updatedAt < diff;
}

export default validateCache;
