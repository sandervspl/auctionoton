import * as i from 'types';
import { LegacyAPI } from '@project/constants';

class Api {
  private requestController!: AbortController;

  /** Cancel the latest API request */
  public cancelRequest() {
    if (this.requestController) {
      this.requestController.abort();
    }
  }

  async getRetailRealms(region?: i.Regions): Promise<i.RetailRealmResult | undefined> {
    if (!region) {
      console.error('No region was provided for getRetailRealms fetch', { region });
      return;
    }

    try {
      const result = await fetch(LegacyAPI.retailRealmsUrl(region));
      const data = await result.json();

      if (!('error' in data)) {
        return data;
      }
    } catch (error) {
      console.error('Error fetching retail realms', { error });
    }
  }
}

const api = new Api();

export default api;
