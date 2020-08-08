import * as i from 'types';
import { atom } from 'recoil';
// import asyncStorage from 'utils/asyncStorage';

export const storageAtom = atom<i.Storage>({
  key: 'storage',
  /**
   * @TODO Use this when bug is fixed
   * https://github.com/facebookexperimental/Recoil/issues/12
   */
  // default: asyncStorage.getAll(),
  default: {
    user: {
      server: {},
    } as any,
    items: {},
  },
});
