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
      const result = await fetch(`${__API__}/item/${server}/${faction}/${itemName}`, {
        signal: this.requestController.signal,
      });
      const data = await result.json() as i.CachedItemData | i.ItemError;


      // Something went wrong
      if ('error' in data) {
        useStore.getState().set((draftState) => {
          draftState.ui.error = data.reason;
        });

        if (__DEV__) {
          console.error(data);
        }

        // Return empty to requester
        return cb(undefined);
      }


      // Set new last updated time
      const cachedData = produce(data, (draftState) => {
        draftState.updatedAt = new Date().getTime();
      });

      // Return data to requester
      cb(cachedData);
    } catch (err) {
      if (__DEV__) {
        console.error(err);
      }
    }
  }
}

const api = new Api();

export default api;
