interface Key {
  href: string;
}

interface LocalisationString {
  it_IT: string;
  ru_RU: string;
  en_GB: string;
  zh_TW: string;
  ko_KR: string;
  en_US: string;
  es_MX: string;
  pt_BR: string;
  es_ES: string;
  zh_CN: string;
  fr_FR: string;
  de_DE: string;
}

interface Region {
  name: LocalisationString;
  id: number;
}

interface Type {
  name: LocalisationString;
  type: string;
}

interface Realm {
  is_tournament: boolean;
  timezone: string;
  name: LocalisationString;
  id: number;
  region: Region;
  category: LocalisationString;
  locale: string;
  type: Type;
  slug: string;
}

interface Status {
  name: LocalisationString;
  type: string;
}

interface LocalisationString {
  it_IT: string;
  ru_RU: string;
  en_GB: string;
  zh_TW: string;
  ko_KR: string;
  en_US: string;
  es_MX: string;
  pt_BR: string;
  es_ES: string;
  zh_CN: string;
  fr_FR: string;
  de_DE: string;
}

interface Population {
  name: LocalisationString;
  type: string;
}

interface Data {
  realms: Realm[];
  id: number;
  has_queue: boolean;
  status: Status;
  population: Population;
}

interface Result {
  key: Key;
  data: Data;
}

export interface RealmIndexSearchResponse {
  page: number;
  pageSize: number;
  maxPageSize: number;
  pageCount: number;
  results: Result[];
}


interface Self {
  href: string;
}

interface Links {
  self: Self;
}

interface ConnectedRealm {
  href: string;
}

interface Item {
  id: number;
}

interface Auction {
  id: number;
  item: Item;
  quantity: number;
  unit_price: number;
  time_left: string;
  buyout?: number;
}

export interface AuctionHouseSearchResponse {
  _links: Links;
  connected_realm: ConnectedRealm;
  auctions: Auction[];
  lastModified: string;
}
