// biome-ignore lint/style/noVar: <explanation>
var addon = chrome || browser;
import { asyncStorage } from 'utils';

export default defineBackground(() => {
  // Reset storage
  // asyncStorage.clear('items');

  // Open page for user's server/faction information after installation
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      asyncStorage.init();
      chrome.tabs.create({ url: './form.html?large=true' });
    }

    if (details.reason === 'update') {
      const prevVersion = details.previousVersion;
      const curVersion = chrome.runtime.getManifest().version;

      // Update to how "lastUpdated" is shown
      if (prevVersion !== '2.3.0' && curVersion === '2.3.0') {
        asyncStorage.clear('items');
      }
    }
  });
});
