import * as i from 'types';
import produce from 'immer';

import { useStore } from 'state/store';


class Api {
  private requestController!: AbortController;

  /** Cancel the latest API request */
  public cancelRequest() {
    if (this.requestController) {
      this.requestController.abort();
    }
  }

  async getItem(itemName: string, onSuccess: SuccessCb, onWarning: WarningCb, onError: ErrorCb): Promise<void> {
    // Get user data
    const user = useStore.getState().storage.user;

    // Fetch latest data from server
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();


      // Show warning of slow response time after x seconds
      const timeoutId = setTimeout(() => {
        onWarning('Nexushub is responding slowly. I will keep trying for a bit longer.');
      }, 5_000);


      // Fetch item from API
      const url = `${__API__}/item/${server}/${faction}/${itemName}`;
      this.requestController = new AbortController();
      const options = {
        signal: this.requestController.signal,
      };

      // Start request and fail timer parallel
      const result = await Promise.race<i.CachedItemData | i.ItemError>([
        fetch(url, options).then((res) => {
          clearTimeout(timeoutId);
          return res.json();
        }),
        new Promise((_, fail) => setTimeout(() => fail('Nexushub is not responding.'), 10_000)),
      ]);


      // Error
      if ('error' in result) {
        onWarning('');
        onError(result.reason);
      }

      // Success
      if ('url' in result) {
        // Set new last updated time

        const cachedData = produce(result, (draftState) => {
          if (result.lastUpdated !== 'Unknown') {
            draftState.updatedAt = new Date().getTime();
          }
        });

        // Update UI
        onWarning('');
        onError('');

        // Return data to requester
        onSuccess(cachedData);
      }
    } catch (err) {
      if (__DEV__) {
        console.error(err);
      }

      // Update UI
      onWarning('');
      onError(err);

      // Return no item
      onSuccess(undefined);
    }
  }
}

type SuccessCb = (item: i.CachedItemData | undefined) => void;
type WarningCb = (text: string) => void;
type ErrorCb = (text: string) => void;

const api = new Api();

export default api;
