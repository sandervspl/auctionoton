import Tooltip from './tooltip';

// Update tooltip on user changes
window.browser.storage.onChanged.addListener((changes) => {
  if (changes.user) {
    Tooltip.generatePageTooltip();
  }
});

// Generate initial page tooltip
onload = Tooltip.generatePageTooltip;
