# Database

This is the Auctionoton database for servers that are not supported by TSM or Nexushub. It is a manual effort for now, so it might not always be up-to-date.

## Development

Code is a little bit janky because it's mostly the result of AI converting the Go parser from AuctionDB to TypeScript. I tried fixing it up a little bit. It is also 100x faster than the original code when working with an external DB.

- Install the [AHDB addon](https://www.curseforge.com/wow/addons/auction-house-database)
- Open AH window and scan items (button or `/ahdb scan`)
- Log out
- Copy the file `World of Warcraft/<game_version>/WTF/Account/<account_name>/SavedVariables/AuctionDB.lua`
- Add it to `src/input` folder
- Run `bun db:insert`
