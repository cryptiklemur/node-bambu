import os from 'node:os';
import path from 'node:path';

export function getBambuStudiosFolder() {
  const userDataFolder =
    process.env.APPDATA ??
    (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');

  switch (os.platform()) {
    case 'win32': {
      return path.resolve(userDataFolder, 'BambuStudio');
    }

    case 'darwin': {
      return path.resolve('/Users/', os.userInfo().username, 'Library', 'Application Support', 'BambuStudio');
    }

    default: {
      return;
    }
  }
}
