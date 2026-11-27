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
