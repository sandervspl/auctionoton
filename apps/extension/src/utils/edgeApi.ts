import rateLimit from 'axios-rate-limit';
import axios from 'axios';

export const edgeAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

export class EdgeAPI {
  static Url = {
    development: 'http://localhost:3000/api',
    production: 'https://auctionoton-api.sandervspl.dev',
  }[process.env.NODE_ENV as string];
}
