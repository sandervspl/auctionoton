import asyncStorage from 'utils/asyncStorage';
// import validateCache from 'utils/validateCache';

// Reset storage
// asyncStorage.clear('items');

// Open page for user's server/faction information after installation
addon.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await asyncStorage.set('user', (draftState) => {
      const { faction, region, server } = asyncStorage.initUserState;

      draftState.region = region;
      draftState.server = server;
      draftState.faction = faction;
    });

    addon.tabs.create({ url: './form.html' });
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


// Clean up browser storage cache on browser startup
// addon.runtime.onStartup.addListener(async () => {
//   const items = await asyncStorage.get('items');
//   const modItems = { ...items };

//   for (const server in items) {
//     for (const faction in items[server]) {
//       for (const itemName in items[server][faction]) {
//         const item = items[server][faction][itemName];

//         if (!validateCache(item)) {
//           delete modItems[server][faction][itemName];

//           if (__DEV__) {
//             // eslint-disable-next-line no-console
//             console.log(`Removed ${server}-${faction}-${itemName} from browser cache`);
//           }
//         }
//       }
//     }
//   }

//   await asyncStorage.set('items', (draftState) => { draftState = modItems; });
// });
