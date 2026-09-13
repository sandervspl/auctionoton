import { redirect } from 'next/navigation';

import { isServer } from 'services/utils';

import { apiConfig } from './config';

export const handleStatusCodes = async (code: number | undefined) => {
  switch (code) {
    case 401:
      if (isServer) {
        window.location.href = apiConfig.loginPath;
        return;
      }

      return redirect(apiConfig.loginPath);
    case 403:
      if (isServer) {
        window.location.href = apiConfig.notFoundPath;
        return;
      }

      return redirect(apiConfig.notFoundPath);
  }

  return;
};

export const getBaseURL = (url: {
  development: string;
  acceptance: string;
  production: string;
}) => {
  if (__ACC__) {
    return url.acceptance;
  }

  if (__TEST__ || __DEV__) {
    return url.development;
  }

  return url.production;
};
