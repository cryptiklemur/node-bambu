# @node-bambu/twitch

[![npm (scoped)](https://img.shields.io/npm/v/@node-bambu/twitch)](https://www.npmjs.com/package/@node-bambu/twitch)

## Testing

Test with code like this:

```typescript
import { BambuBot } from './index';

async function onStart() {
  console.log('Bot started');

  //console.dir(await bot.bambu.ftp.list('/'));
}

async function main() {
  const bot = new BambuBot({
    discord: {
      clientId: '<discord bot application id>',
      publicKey: '<discord bot public key>',
      token: '<discord bot token>',
    },
  });

  bot.start().then(onStart).catch(console.dir);
}

main();
```
