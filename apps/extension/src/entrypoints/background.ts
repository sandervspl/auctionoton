import * as i from 'types';
import { storage } from 'wxt/storage';
import { itemCache } from '@/utils/storage';

export default defineBackground(() => {
  void itemCache.prune().catch(() => undefined);

  // Open private extension pages from the background, not the host web page.
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'open-realm-settings' || typeof message.version !== 'string') return;

    const url = new URL(browser.runtime.getURL('/popup.html'));
    url.searchParams.set('large', 'true');
    url.searchParams.set('version', message.version);
    return browser.tabs.create({ url: url.href }).then(() => undefined);
  });

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
