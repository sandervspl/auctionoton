import asyncStorage from 'utils/asyncStorage';
import validateCache from 'utils/validateCache';


// Open page for user's server/faction information after installation
addon.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    asyncStorage.set({
      user: {
        region: 'us',
        server: {
          name: 'Amnennar',
          slug: 'amnennar',
        },
        faction: 'Alliance',
      },
    });

    addon.tabs.create({ url: './form.html' });
  }
});


// Clean up browser storage cache on browser startup
addon.runtime.onStartup.addListener(async () => {
  const items = await asyncStorage.get('items');
  const modItems = { ...items };

  for (const server in items) {
    for (const faction in items[server]) {
      for (const itemName in items[server][faction]) {
        const item = items[server][faction][itemName];

        if (!validateCache(item)) {
          delete modItems[server][faction][itemName];

          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(`Removed ${server}-${faction}-${itemName} from browser cache`);
          }
        }
      }
    }
  }

  await asyncStorage.set({ items: modItems });
});
