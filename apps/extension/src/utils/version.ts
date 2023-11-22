import * as i from 'types';

export function getVersion() {
  let version: i.Version = 'classic';

  if (window.location.href.includes('wowhead.com/classic')) {
    version = 'era';
  }

  return version;
}
