import Tooltip from './tooltip';

/**
 * Rename browser namespaces to 'browser' for cross-browser support
 */
window.browser = window.browser || window.chrome || window.msBrowser;

// Update tooltip on user changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.user) {
    Tooltip.generatePageTooltip();
  }
});

// Generate initial page tooltip
onload = Tooltip.generatePageTooltip;
