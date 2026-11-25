import rateLimit from 'axios-rate-limit';
import axios from 'axios';
import { apiOrigin } from '../../api.config';

export const auctionotonAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

// Release builds use production; development builds use staging (see api.config.ts).
export const auctionotonAPIUrl = apiOrigin;
