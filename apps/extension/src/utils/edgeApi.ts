import rateLimit from 'axios-rate-limit';
import axios from 'axios';

export const edgeAPI = rateLimit(axios.create(), { maxRequests: 3, perMilliseconds: 500 });
