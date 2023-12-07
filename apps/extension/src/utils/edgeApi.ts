import rateLimit from 'axios-rate-limit';
import axios from 'axios';

export const edgeAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

export class EdgeAPI {
  static Url = {
    development: 'http://localhost:3000/api',
    // development: 'https://auctionoton-edge-api-sandervspl.vercel.app/api',
    production: 'https://auctionoton-edge-api.vercel.app/api',
  }[process.env.NODE_ENV as string];
  static ItemUrl = `${this.Url}/item`;
  static RealmsUrl = `${this.Url}/realms`;
  static BlobUrl = `${this.Url}/blob`;
}
