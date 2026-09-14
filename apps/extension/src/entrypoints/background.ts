import * as i from 'types';
import { storage } from 'wxt/storage';
import { itemCache } from '@/utils/storage';

export default defineBackground(() => {
  void itemCache.prune().catch(() => undefined);

  async function init() {
    const items: i.ItemsData = {};
    const user: Partial<i.UserData> = {
      realms: {},
      faction: {},
    };
    const ui: i.UiData = {
      showTip: {
        shiftKey: true,
      },
    };

    await Promise.all([
      storage.setItem('local:items', items),
      storage.setItem('local:ui', ui),
      storage.setItem('local:user', user),
    ]);
  }

  // Open page for user's server/faction information after installation
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      await init();
      browser.tabs.create({ url: './popup.html?large=true' });
    }

    if (details.reason === 'update') {
      const prevVersion = details.previousVersion;
      const curVersion = browser.runtime.getManifest().version;

      // Update to how "lastUpdated" is shown
      if (prevVersion !== '2.3.0' && curVersion === '2.3.0') {
        storage.removeItem('local:items');
      }
    }
  });
});
