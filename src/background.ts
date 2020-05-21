import AsyncStorage from './asyncStorage';

chrome.runtime.onInstalled.addListener((details) => {
  // Open page for user's server/faction information after installation
  if (details.reason === 'install') {
    AsyncStorage.set({
      user: {
        server: {
          name: 'Amnennar',
          slug: 'amnennar',
        },
        faction: 'Alliance',
      },
    });

    chrome.tabs.create({ url: './index.html' });
  }
});
