import * as i from 'types';
import { useStore } from 'state/store';
import asyncStorage from 'utils/asyncStorage';
import api from 'utils/api';
import sanitizeItemName from 'utils/sanitizeItemName';
import validateCache from 'utils/validateCache';


class ItemMgr {
  get(itemName: string, onSuccess: SuccessCb, onWarning: WarningCb, onError: ErrorCb): i.CachedItemData | undefined {
    // Prepare item name for request
    itemName = sanitizeItemName(itemName);

    // First we check state
    const item = useStore.getState().storage.actions.getItem(itemName);


    // Second, we check browser storage
    if (!validateCache(item)) {
      asyncStorage.getItem(itemName, (item) => {
        // Return if we found a valid item from storage
        if (validateCache(item)) {
          onSuccess(item);
          // No item found in any cache, so fetch it from the API
        } else {
          function onSuccess(item: i.CachedItemData | undefined) {
            // Save requested data to storage
            if (item) {
              asyncStorage.addItem(itemName, item);
              onSuccess(item);
            } else {
              onError('Something went wrong fetching this item.');
            }
          }

          api.getItem(itemName, onSuccess, onWarning, onError);
        }
      },
      );
    }


    // Return item from state (if exists) instantly while we wait for other options to resolve (if necessary)
    if (item) {
      onSuccess(item);
    }

    return item;
  }
}

type SuccessCb = (item: i.CachedItemData) => void;
type WarningCb = (text: string) => void;
type ErrorCb = (text: string) => void;

const itemMgr = new ItemMgr();

export default itemMgr;
