// import { Buffer } from 'buffer-polyfill';

import { AccessToken, GameItem } from './types';
import { kv } from '../../kv';

export async function getAccessToken() {
  const { BNET_CLIENT_ID, BNET_CLIENT_SECRET } = process.env;

  const KV_KEY = 'bnet:access_token';

  const cached = await kv.get(KV_KEY);
  if (cached) {
    return cached;
  }

  console.log('Refreshing Blizzard access token...');

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
    try {
      await response.body?.cancel?.();
    } catch (err) {}
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AccessToken;

  try {
    await kv.set('bnet:access_token', data.access_token, {
      EX: 60 * 60 * 3,
    });
  } catch (error: any) {
    console.error('kv error:', error.message || 'unknown error');
  }

  return data.access_token;
}

export async function getItemFromBnet(id: number, locale = 'en_US') {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    namespace: 'static-classic1x-us',
    locale,
    access_token: accessToken,
  });

  console.info('3. Fetching item from Blizzard');
  const response = await fetch(`https://us.api.blizzard.com/data/wow/item/${id}?${params}`);

  if (response.status !== 200) {
    try {
      await response.body?.cancel?.();
    } catch (err) {}
    console.error(`Failed to get item ${id}: ${response.status} ${response.statusText}`);
    throw new Error('Failed to get item');
  }

  const data = (await response.json()) as GameItem;

  return data;
}
