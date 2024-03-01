import rateLimit from 'axios-rate-limit';
import axios from 'axios';

export const auctionotonAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

export const auctionotonAPIUrl = {
  development: 'http://localhost:3000/api',
  production: 'https://auctionoton-api.sandervspl.dev',
}[process.env.NODE_ENV as string];
