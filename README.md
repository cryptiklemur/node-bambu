# Bambu NodeJS Libraries

Available packages:

- [@node-bambu/core](packages/core) - The core Bambu NodeJS library
- [@node-bambu/discord](packages/discord) - A discord bot for the Bambu Printers
- [@node-bambu/twitch](packages/twitch) - A twitch bot for the Bambu Printers

Can install either of them with your favorite node package manager:

```shell
npm i @node-bambu/core @node-bambu/discord
pnpm i @node-bambu/core @node-bambu/discord
yarn add @node-bambu/core @node-bambu/discord
```

# Running it all together!

Clone this repo, and copy `.env.dist` to `.env`.
Fill out the `DISCORD_` environment variables, and the `TWITCH_` ones if you want.

Then, run gs`nx run @node-bambu/bot:serve`
