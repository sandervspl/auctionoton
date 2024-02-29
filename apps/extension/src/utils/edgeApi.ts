import rateLimit from 'axios-rate-limit';
import axios from 'axios';

export const edgeAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

export class EdgeAPI {
  static Url = {
    development: 'http://localhost:3000/api',
    // development: 'https://auctionoton-api-valor.vercel.app/api',
    // production: 'https://auctionoton-api.vercel.app/api',
    production: 'http://auctionoton-api.sandervspl.dev',
    // production: 'http://nooog88.168.119.167.208.sslip.io',
    // production: 'https://auctionoton-edge-api.vercel.app/api',
  }[process.env.NODE_ENV as string];
}
