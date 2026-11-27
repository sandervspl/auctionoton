# Auctionoton

Auctionoton shows World of Warcraft auction house prices for items, per realm market, on a website and in a browser extension.

## Markets and prices

**Auction house**:
One market where items are bought and sold, identified by game version, region and auction house id. Realms that share a market share one auction house; factions with separate markets are separate auction houses.
_Avoid_: House, realm (a realm can map to more than one auction house)

**Snapshot**:
The prices of every listed item in one auction house on one day.
_Avoid_: Scan, import, dump

**Price history**:
The sequence of daily prices for one item in one auction house.
_Avoid_: Price log, timeline

## History tiers

**Hot history**:
The recent part of price history, kept where the website reads latest prices and short charts quickly.
_Avoid_: Live data, recent data, cache

**Archived history**:
Price history older than hot history, kept forever at full daily detail and still readable for long-range charts.
_Avoid_: Cold storage, backup, old data

**Sealed month**:
A calendar month of archived history that can no longer receive new or corrected snapshots.
_Avoid_: Closed month, finished month, completed month

## Realms

**Game version**:
A separately run edition of Classic with its own realms and economy, such as Era, Hardcore, Season of Discovery, Anniversary or Forever.
_Avoid_: Flavor, game type

## Item search

**Item catalog**:
Every item Blizzard publishes for the game version, whether or not it can be traded.
_Avoid_: Item database, item list

**Searchable item**:
An item from the Item catalog that does not bind on pickup, is not a quest item, and is an Observed item for the selected Game version or newly added to the catalog; only these are returned by search.
_Avoid_: Tradeable item, AH item

**Observed item**:
An item that appeared in at least one realm's public auction house price list for a given Game version during a Realm sweep.

**Realm sweep**:
A periodic read of every catalog realm's public price list, kept only as per-item aggregates, never as prices.

**Popularity**:
The number of realms of a Game version on which an item appeared in the latest Realm sweep; used to order equally good search matches.
_Avoid_: Score, rank

**Synonym**:
A curated alternative wording that search treats as equivalent. An **item synonym** points a query straight at specific items ("mcp" → Manual Crowd Pummeler); a **word synonym** stands in for words in any item name ("pot" → "potion").
_Avoid_: Alias, keyword
