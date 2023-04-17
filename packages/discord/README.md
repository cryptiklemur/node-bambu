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
  const bot = new BambuBot(
    new BambuClient({
      host: '10.10.20.101', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > IP)
      port: 8883,
      token: '<your-token-here>', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > Access Code)
      serial: '<your-serial-here>', // Found inside the Bambu System Settings on the Bambu printer itself (Click the Cog > General > Device Info)
    }),
    {
      discord: {
        clientId: '<discord bot application id>',
        publicKey: '<discord bot public key>',
        token: '<discord bot token>',
      },
      streamUrl: '<Twitch or Youtube stream URL for your bot status>',
    },
  );

  bot.start().then(onStart).catch(console.dir);
}

main();
```
