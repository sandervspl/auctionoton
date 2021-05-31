import * as i from 'types';
import { useStore } from 'state/store';
import asyncStorage from 'utils/asyncStorage';
import api from 'utils/api';
import sanitizeItemName from 'utils/sanitizeItemName';
import validateCache from 'utils/validateCache';


class ItemMgr {
  get(itemName: string, cb: (item: i.CachedItemData | undefined) => void): i.CachedItemData | undefined {
    useStore.getState().set((draftState) => {
      draftState.ui.error = undefined;
    });

    // Prepare item name for request
    itemName = sanitizeItemName(itemName);

    // First we check state
    const item = useStore.getState().storage.actions.getItem(itemName);


    // Second, we check browser storage
    if (!validateCache(item)) {
      asyncStorage.getItem(itemName, (item) => {
        // Return if we found a valid item from storage
        if (validateCache(item)) {
          cb(item);
        // No item found in any cache, so fetch it from the API
        } else {
          api.getItem(itemName, (item) => {
            // Save requested data to storage
            if (item) {
              asyncStorage.addItem(itemName, item);
            }

            cb(item);
          });
        }
      });
    }


    // Return item from state (if exists) instantly while we wait for other options to resolve (if necessary)
    if (item) {
      cb(item);
    }

    return item;
  }
}

const itemMgr = new ItemMgr();

export default itemMgr;
