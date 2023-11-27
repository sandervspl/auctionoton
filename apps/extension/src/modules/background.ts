import asyncStorage from 'utils/asyncStorage';

// Reset storage
// asyncStorage.clear('items');

// Open page for user's server/faction information after installation
addon.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    asyncStorage.init();
    addon.tabs.create({ url: './form.html?large=true' });
  }

  if (details.reason === 'update') {
    const prevVersion = details.previousVersion;
    const curVersion = addon.runtime.getManifest().version;

    // Update to how "lastUpdated" is shown
    if (prevVersion !== '2.3.0' && curVersion === '2.3.0') {
      asyncStorage.clear('items');
    }
  }
});
