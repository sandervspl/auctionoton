import Tooltip from './tooltip';

// Update tooltip on user changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.user) {
    Tooltip.generatePageTooltip();
  }
});

// Generate initial page tooltip
Tooltip.generatePageTooltip();
