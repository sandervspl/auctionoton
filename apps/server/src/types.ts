export * from './utils/blizzard/types';

export namespace NexusHub {
  interface Tooltip {
    label: string;
    format?: string;
  }

  interface Current {
    historicalValue: number;
    marketValue: number;
    minBuyout: number;
    numAuctions: number;
    quantity: number;
  }

  interface Previous {
    marketValue: number;
    minBuyout: number;
    quantity: number;
    historicalValue: number;
    numAuctions: number;
  }

  interface Stats {
    lastUpdated: Date_ISO_8601;
    current: Current | null;
    previous: Previous | null;
  }

  export interface ItemsResponse {
    server: string;
    itemId: NumberString;
    name: string;
    uniqueName: string;
    icon: string | null;
    tags: string | string[];
    requiredLevel: NumberString | null;
    itemLevel: NumberString | null;
    sellPrice: NumberString;
    vendorPrice?: NumberString | null;
    tooltip: Tooltip[];
    itemLink?: string | null;
    stats: Stats;
  }

  export interface ErrorResponse {
    error: string;
    reason: string;
  }
}

export type Date_ISO_8601 = string;
export type NumberString = number | string;

export type PriceObject =
  | string
  | {
      gold: NumberString;
      silver: NumberString;
      copper: NumberString;
      raw: NumberString;
    };

export type PriceSnapshot = {
  marketValue: PriceObject;
  historicalValue: PriceObject;
  minBuyout: PriceObject;
  numAuctions: NumberString;
  quantity: NumberString;
};

export type ItemResponse = Omit<NexusHub.ItemsResponse, 'stats' | 'tags' | 'tooltip'> & {
  amount: NumberString;
  stats: {
    lastUpdated: Date_ISO_8601;
    current: PriceSnapshot;
    previous: PriceSnapshot;
  };
  tags: string;
  tooltip: undefined;
};

export type MachinesResponse = Machine[];

export interface Machine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  config: Config;
  image_ref: ImageRef;
  created_at: string;
  updated_at: string;
  events: Event[];
}

export interface Config {
  init: Init;
  image: string;
  restart: Restart;
  guest: Guest;
  processes?: Process[];
  dns?: Dns;
}

export interface Init {}

export interface Restart {
  policy?: string;
}

export interface Guest {
  cpu_kind: string;
  cpus: number;
  memory_mb: number;
}

export interface Process {
  cmd: string[];
  env?: Env;
}

export interface Env {
  API_URL: string;
  APP_ENV: string;
  AXIOM_ORG_ID: string;
  AXIOM_TOKEN: string;
  DEPLOY_STATUS_API_URL: string;
  EDGE_CONFIG: string;
  PORT: string;
  PUBLIC_BNET_CLIENT_ID: string;
  PUBLIC_BNET_CLIENT_SECRET: string;
  PUBLIC_MAX_LEVEL: string;
  PUBLIC_WOW_CURRENT_PATCH: string;
  PUBLIC_WOW_CURRENT_SEASON: string;
  SUPABASE_ACCESS_TOKEN_CLI_LOGIN__DO_NOT_USE: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_PROJECT_ID: string;
  SUPABASE_PUBLIC_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  TZ: string;
  WOWVALOR_SECRET: string;
}

export interface Dns {}

export interface ImageRef {
  registry: string;
  repository: string;
  tag: string;
  digest: string;
  labels: Labels;
}

export interface Labels {
  'org.opencontainers.image.created': string;
  'org.opencontainers.image.description': string;
  'org.opencontainers.image.licenses': string;
  'org.opencontainers.image.revision': string;
  'org.opencontainers.image.source': string;
  'org.opencontainers.image.title': string;
  'org.opencontainers.image.url': string;
  'org.opencontainers.image.version': string;
}

export interface Event {
  id: string;
  type: string;
  status: string;
  request?: EventRequest;
  source: string;
  timestamp: number;
}

export interface EventRequest {
  exit_event: ExitEvent;
  restart_count: number;
}

export interface ExitEvent {
  requested_stop: boolean;
  restarting: boolean;
  guest_exit_code: number;
  guest_signal: number;
  guest_error: string;
  exit_code: number;
  signal: number;
  error: string;
  oom_killed: boolean;
  exited_at: string;
}

export type RateLimit = {
  limit: number;
  remaining: number;
  reset: number;
};
