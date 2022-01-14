# Auctionoton

Display current Auction House price data for items on classic.wowhead.com.

This extension adds a second tooltip to items on classic.wowhead.com containing the latest Auction House price information for your selected server. You can select the region, server and faction you want to be displayed.

All Chromium based browsers are supported. This includes: Chrome, Firefox, Brave, Edge and Opera.

There are currently no plans to support Safari.

# Download
- Chrome/Brave/Edge/Opera: https://chrome.google.com/webstore/detail/auctionoton-auction-house/ffflgkmjodhdladikaglbeofemhbojio?hl=en&authuser=0
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/auctionoton/

# Build instructions (for Mozilla)
A step by step guide for building the compiled code

## Requirements
These are the programs used to compile the current version

- MacOS Catalina v10.15.4
- Node v10.16.0
- NPM v6.14.5

## Building
Run the following commands in order

1. `$ npm install`
2. `$ npm run build`

# Development Workflow
- Navigate to this project in your terminal
- Start the dev server with `dev`
- Open your browser (preferably a chromium browser)
- Go to the extensions page (i.e. brave://extensions/)
- If not loaded yet, click on `Load unpacked`
  - Go to the project folder and click `Select` (no need to select a file)
- After a rebuild, click the refresh button
- Reload the page where you are testing the extension