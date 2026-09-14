import rateLimit from 'axios-rate-limit';
import axios from 'axios';
import { apiOrigin } from '../../api.config';

export const auctionotonAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });

// Both development and packaged extensions use the active staging backend.
export const auctionotonAPIUrl = apiOrigin;
