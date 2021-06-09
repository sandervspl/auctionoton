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
        // Fetch item from API if there is nothing in storage or if data is too old
        if (!item || !validateCache(item)) {
          function onFetchSuccess(item: i.CachedItemData | undefined) {
            // Save requested data to storage
            if (item) {
              asyncStorage.addItem(itemName, item);
              onSuccess(item);
            } else {
              onError('Something went wrong fetching this item. This might be because Nexushub is down. Click the Nexushub.co link below to verify.');
            }
          }

          api.getItem(itemName, onFetchSuccess, onWarning, onError);
        }

        // Return if we found an item from storage
        if (item) {
          const stopLoading = validateCache(item);
          onSuccess(item, stopLoading);
        }
      });
    }

    // Return item from state (if exists) instantly while we wait for other options to resolve (if necessary)
    if (item) {
      onSuccess(item);
    }

    return item;
  }
}

type SuccessCb = (item: i.CachedItemData, stopLoading?: boolean) => void;
type WarningCb = (text: string) => void;
type ErrorCb = (text: string) => void;

const itemMgr = new ItemMgr();

export default itemMgr;
