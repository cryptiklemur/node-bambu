import os from 'node:os';
import path from 'node:path';

let slicer: 'BambuStudio' | 'OrcaSlicer' = 'BambuStudio';

if (process.env.NODE_SLICER) {
  if (['BambuStudio', 'OrcaSlicer'].includes(process.env.NODE_SLICER)) {
    slicer = process.env.NODE_SLICER as typeof slicer;
  } else {
    console.warn(
      `Provided slicer (${process.env.NODE_SLICER}) is not compatible with the @node-bambu/core library. Defaulting to BambuStudio`,
    );
  }
}

export function getBambuStudiosFolder() {
  const userDataFolder =
    process.env.APPDATA ??
    (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');

  switch (os.platform()) {
    case 'win32': {
      return path.resolve(userDataFolder, slicer);
    }

    case 'darwin': {
      return path.resolve('/Users/', os.userInfo().username, 'Library', 'Application Support', 'BambuStudio');
    }

    default: {
      return;
    }
  }
}
