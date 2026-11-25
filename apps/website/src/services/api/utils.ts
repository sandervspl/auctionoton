import { redirect } from '@tanstack/react-router';

import { isServer } from 'services/utils';

import { apiConfig } from './config';

export const handleStatusCodes = async (code: number | undefined) => {
  switch (code) {
    case 401:
      if (!isServer) {
        window.location.href = apiConfig.loginPath;
        return;
      }

      throw redirect({ href: apiConfig.loginPath });
    case 403:
      if (!isServer) {
        window.location.href = apiConfig.notFoundPath;
        return;
      }

      throw redirect({ href: apiConfig.notFoundPath });
  }

  return;
};

export const getBaseURL = (url: {
  development: string;
  acceptance: string;
  production: string;
}) => {
  if (import.meta.env.MODE === 'acceptance') {
    return url.acceptance;
  }

  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return url.development;
  }

  return url.production;
};
