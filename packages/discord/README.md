# discord-bambu

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build discord-bambu` to build the library.

## Testing

Test with code like this:

```typescript
import {BambuBot} from './index';

const bot = new BambuBot({
  discord: {
    clientId: 'Application ID Here',
    publicKey: 'Public Key Here',
    token: 'Bot token here',
  },
  printer: {
    host: '10.10.20.101', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > IP)
    port: 8883,
    token: '<your-token-here>', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > Access Code)
    serial: '<your-serial-here>' // Found inside the Bambu System Settings on the Bambu printer itself (Click the Cog > General > Device Info)
  },
  streamUrl: 'Twitch or Youtube url that you are streaming to with OBS', // Optional
});

async function onStart() {
  console.log('Bot started');

  //console.dir(await bot.bambu.ftp.list('/'));
}

bot.start().then(onStart).catch(console.dir);
```
