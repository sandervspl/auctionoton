# API

Edge API hosted on Vercel

## Database

The Auctionoton API mainly uses Nexushub to get AH data, but for classic-era servers we have our own database.

### Development

Code is a little bit janky because it's mostly the result of AI converting the Go parser from AuctionDB to TypeScript. I tried fixing it up a little bit. It is also 100x faster than the original code when working with an external DB.

- Install the [AHDB addon](https://www.curseforge.com/wow/addons/auction-house-database)
- Open AH window and scan items (button or `/ahdb scan`)
- Log out
- Copy the file `World of Warcraft/<game_version>/WTF/Account/<account_name>/SavedVariables/AuctionDB.lua`
- Add it to `src/input` folder
- Run `bun db:insert`
