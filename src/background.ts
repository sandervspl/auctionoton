import AsyncStorage from './asyncStorage';

browser.runtime.onInstalled.addListener((details) => {
  // Open page for user's server/faction information after installation
  if (details.reason === 'install') {
    AsyncStorage.set({
      user: {
        region: 'us',
        server: {
          name: 'Amnennar',
          slug: 'amnennar',
        },
        faction: 'Alliance',
      },
    });

    browser.tabs.create({ url: './form.html' });
  }
});
