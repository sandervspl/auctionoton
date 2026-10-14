import { ofetch } from 'ofetch';

import { getBaseURL, handleStatusCodes } from './utils';

/** Website API client */
export const websiteApi = ofetch.create({
  baseURL: getBaseURL({
    development: 'http://localhost:3000/api',
    acceptance: 'http://localhost:3000/api',
    production: 'http://localhost:3000/api',
  }),
  onResponseError: ({ response }) => {
    return handleStatusCodes(response.status);
  },
});
