import { kv } from '@vercel/kv';
// @ts-ignore
import { Buffer } from 'buffer-polyfill';

import { AccessToken, GameItem } from './types.js';

export async function getAccessToken() {
  const KV_KEY = 'bnet:access_token';

  const cached = await kv.get<string>(KV_KEY);
  if (cached) {
    return cached;
  }

  const { BNET_CLIENT_ID, BNET_CLIENT_SECRET } = process.env;
  const response = await fetch('https://eu.battle.net/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${BNET_CLIENT_ID}:${BNET_CLIENT_SECRET}`).toString(
        'base64',
      )}`,
    },
  });

  if (response.status !== 200) {
    throw new Error('Failed to get access token');
  }

  const data = (await response.json()) as AccessToken;

  try {
    await kv.set('bnet:access_token', data.access_token, {
      ex: 60 * 60 * 3,
    });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return data.access_token;
}

export async function getItemFromBnet(id: number, locale = 'en_US') {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    namespace: 'static-classic-us',
    locale,
    access_token: accessToken,
  });

  const response = await fetch(`https://us.api.blizzard.com/data/wow/item/${id}?${params}`);

  if (response.status !== 200) {
    throw new Error('Failed to get item');
  }

  const data = (await response.json()) as GameItem;

  return data;
}
