import * as i from 'types';
import { API } from '@project/constants';


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
      return;
    }

    const url = `${API.Url}/retail/realms/${region}`;

    const result = await fetch(url);
    const data = await result.json();

    if (!('error' in data)) {
      return data;
    }
  }
}

const api = new Api();

export default api;
