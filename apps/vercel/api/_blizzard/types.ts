import { qualityMap } from '../_utils.js';

export type AccessToken = {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  scope?: string;
};

export type GameItem = {
  _links: Links;
  id: number;
  name: string;
  quality: Quality;
  level: number;
  required_level: number;
  media: Media;
  item_class: ItemClass;
  item_subclass: ItemSubclass;
  inventory_type: InventoryType;
  purchase_price: number;
  sell_price: number;
  max_count: number;
  is_equippable: boolean;
  is_stackable: boolean;
  preview_item: PreviewItem;
  purchase_quantity: number;
};

export type Links = {
  self: Self;
};

export type Self = {
  href: string;
};

export type Quality = {
  type: keyof typeof qualityMap;
  name: string;
};

export type Media = {
  key: Key;
  id: number;
};

export type Key = {
  href: string;
};

export type ItemClass = {
  key: Key2;
  name: string;
  id: number;
};

export type Key2 = {
  href: string;
};

export type ItemSubclass = {
  key: Key3;
  name: string;
  id: number;
};

export type Key3 = {
  href: string;
};

export type InventoryType = {
  type: string;
  name: string;
};

export type PreviewItem = {
  item: Item;
  quality: Quality2;
  name: string;
  media: Media2;
  item_class: ItemClass2;
  item_subclass: ItemSubclass2;
  inventory_type: InventoryType2;
  binding: Binding;
  unique_equipped: string;
  weapon: Weapon;
  stats: Stat[];
  spells: Spell[];
  sell_price: SellPrice;
  requirements: Requirements;
  durability: Durability;
};

export type Item = {
  key: Key4;
  id: number;
};

export type Key4 = {
  href: string;
};

export type Quality2 = {
  type: string;
  name: string;
};

export type Media2 = {
  key: Key5;
  id: number;
};

export type Key5 = {
  href: string;
};

export type ItemClass2 = {
  key: Key6;
  name: string;
  id: number;
};

export type Key6 = {
  href: string;
};

export type ItemSubclass2 = {
  key: Key7;
  name: string;
  id: number;
};

export type Key7 = {
  href: string;
};

export type InventoryType2 = {
  type: string;
  name: string;
};

export type Binding = {
  type: string;
  name: string;
};

export type Weapon = {
  damage: Damage;
  attack_speed: AttackSpeed;
  dps: Dps;
  additional_damage: AdditionalDamage[];
};

export type Damage = {
  min_value: number;
  max_value: number;
  display_string: string;
  damage_class: DamageClass;
};

export type DamageClass = {
  type: string;
  name: string;
};

export type AttackSpeed = {
  value: number;
  display_string: string;
};

export type Dps = {
  value: number;
  display_string: string;
};

export type AdditionalDamage = {
  min_value: number;
  max_value: number;
  display_string: string;
  damage_class: DamageClass2;
};

export type DamageClass2 = {
  type: string;
  name: string;
};

export type Stat = {
  type: Type;
  value: number;
  display: Display;
};

export type Type = {
  type: string;
  name: string;
};

export type Display = {
  display_string: string;
  color: Color;
};

export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type Spell = {
  spell: Spell2;
  description: string;
};

export type Spell2 = {
  key: Key8;
  name: string;
  id: number;
};

export type Key8 = {
  href: string;
};

export type SellPrice = {
  value: number;
  display_strings: DisplayStrings;
};

export type DisplayStrings = {
  header: string;
  gold: string;
  silver: string;
  copper: string;
};

export type Requirements = {
  level: Level;
};

export type Level = {
  value: number;
  display_string: string;
};

export type Durability = {
  value: number;
  display_string: string;
};
