const fs = require('fs');
const path = require('path');

const { getBambuStudiosFolder } = require('../src/util/getBambuStudiosFolder');

function getCredentials() {
  const folder = getBambuStudiosFolder();

  if (!folder) {
    console.error('Please run bambu studio and connect to your printer on this computer before running this.');

    return;
  }

  const configString = fs.readFileSync(path.resolve(folder, 'BambuStudio.conf'));
  const config = JSON.parse(config);

  console.log("Below is a list of each printer's serial number and its token: ");

  for (const [sn, token] of Object.keys(config.access_code)) {
    console.log(`Serial: ${sn} token: ${token}`);
  }
}

getCredentials();
