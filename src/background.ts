import AsyncStorage from './asyncStorage';

window.browser.runtime.onInstalled.addListener((details) => {
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

    window.browser.tabs.create({ url: './form.html' });
  }
});
