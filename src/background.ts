chrome.runtime.onInstalled.addListener((details) => {
  // Open page for user's server/faction information after installation
  if (details.reason === 'install') {
    chrome.tabs.create({ url: './index.html' });
  }
});
