# discord-bambu

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build discord-bambu` to build the library.

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
