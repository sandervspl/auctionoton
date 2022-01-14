export interface TokenResult {
  access_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface FetchData {
  status: number;
  data: object;
}
