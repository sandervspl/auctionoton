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

  async getItem(itemName: string, cb: (item: i.CachedItemData | undefined) => void): Promise<void> {
    // Get user data
    const user = useStore.getState().storage.user;

    // Fetch latest data from server
    try {
      const server = user.server.slug.toLowerCase();
      const faction = user.faction.toLowerCase();

      this.requestController = new AbortController();

      const url = `${__API__}/item/${server}/${faction}/${itemName}`;
      const options = {
        signal: this.requestController.signal,
      };
      const result = await Promise.race<i.CachedItemData | i.ItemError>([
        fetch(url, options).then((res) => res.json()),
        new Promise((_, fail) => setTimeout(() => fail('Nexushub is not responding.'), 10_000)),
      ]);


      // Success
      if ('url' in result) {
        // Set new last updated time
        const cachedData = produce(result, (draftState) => {
          draftState.updatedAt = new Date().getTime();
        });

        // Return data to requester
        cb(cachedData);
      }
    } catch (err) {
      if (__DEV__) {
        console.error(err);
      }

      useStore.getState().set((draftState) => {
        draftState.ui.error = err;
      });

      cb(undefined);
    }
  }
}

const api = new Api();

export default api;
