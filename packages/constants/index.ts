import * as i from '@project/types';

export class EdgeAPI {
  static Url = {
    development: 'http://localhost:3000/api',
    // development: 'https://auctionoton-edge-api.vercel.app/api',
    production: 'https://auctionoton-edge-api.vercel.app/api',
  }[process.env.NODE_ENV as string];

  static ItemUrl = `${this.Url}/item`;
  static ItemsUrl = `${this.Url}/items`;
}

export class LegacyAPI {
  static Url = {
    // development: 'https://5d9b-82-168-31-31.ngrok.io',
    development: 'http://localhost:8080',
    production: 'https://auctionoton-production.up.railway.app',
  }[process.env.NODE_ENV as string];

  private static RetailRootUrl = 'retail';

  static retailRealmsUrl = (region: i.Regions) => {
    return `${this.Url}/${this.RetailRootUrl}/realms/${region}`;
  };
}
