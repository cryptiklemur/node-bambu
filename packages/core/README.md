# @node-bambu/core

[![npm (scoped)](https://img.shields.io/npm/v/@node-bambu/core)](https://www.npmjs.com/package/@node-bambu/core)

This library is for integrating with the MQTT server running on the Bambu Labs' printers.

## Usage

```typescript
import { BambuClient } from './lib/BambuClient';

const client = new BambuClient({
  host: '10.10.20.101', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > IP)
  port: 8883,
  token: '<your-token-here>', // Found inside the Bambu Network Settings on the Bambu printer itself (Click the Cog > Network > Access Code)
  serial: '<your-serial-here>', // Found inside the Bambu System Settings on the Bambu printer itself (Click the Cog > General > Device Info)
});

client.on('print:update', (job) => {
  console.log('Update: ', job);
});
client.on('print:start', (job) => {
  console.log('Start: ', job);
});
client.on('print:finish', (job) => {
  console.log('Finish: ', job);
  client.disconnect();
});

client.connect();
```

## Building

Run `nx build node-bambu` to build the library.
