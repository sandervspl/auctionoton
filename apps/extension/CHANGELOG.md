# extension

## 5.3.0

### Minor Changes

- Show loader per reagent
- Code improvements

## 5.2.1

### Patch Changes

- Fixed crafting cost breakdown with items not found on the auction house

## 5.2.0

### Minor Changes

- 2a9407d: - Add version to item API
  - Speed up item API by fetching AH in the background
  - Fix switching servers between wowhead.com/classic and wowhead.com/cata

## 5.1.2

### Patch Changes

- 8e15ba5: Replace anything related to wotlk to cata or classic

## 5.1.1

### Patch Changes

- dc4932e: Rename tab to Cataclysm

## 5.1.0

### Minor Changes

- Add support for new server
- Fix crafting price
- Improve error for item not found
- Add wowhead.com/cata support

## 5.0.0

### Major Changes

- Switch to Tradeskillmaster API

## 4.2.1

### Patch Changes

- 9ebd45e: Fixed realm not saving properly

## 4.2.0

### Minor Changes

- 83e70a6: - Added support for Hardcore realms (EU only)
  - Updated realm form

## 4.1.3

### Patch Changes

- Fixed shift key keybind on item hover tooltip

## 4.1.2

### Patch Changes

- e3bd496: Updated realm lists
- 24b2395: Delete Retail as option from server selection

## 4.1.1

### Patch Changes

- 4624892: Improved reliability of the tooltip when hovering an item

## 4.1.0

### Minor Changes

- b285117: Added a new tooltip to show the crafting price of an item on the item page and the item's crafting spell page

## 4.0.0

### Major Changes

- 14239c6: Update to Manifest v3

## 3.2.8

### Patch Changes

- f3c1773: Fix prices not showing when there is no lastUpdated but there is data

## 3.2.7

### Patch Changes

- fedcdb1: Fix "This Item Begins a Quest" items not showing the tooltip
- Update to push new version to stores
- d39119a: Refetch item on window focus, and recalculate last updated on interval and window focus
- Updated dependencies
  - @project/constants@0.0.2
  - @project/types@0.0.1
  - @project/utils@0.0.1
  - @project/validation@0.0.1

## 3.2.6

### Patch Changes

- 25cbc48: Add color indication for last updated time

## 3.2.4

### Patch Changes

- Remove preflight Tailwind styles that were affecting base HTML components

## 3.2.3

### Patch Changes

- Fix an issue where the form would not properly save your data if this is the first time setting up the extension

## 3.2.1

### Patch Changes

- df97caa: Add prefix to tailwind classes to prevent CSS clashing

## 3.2.0

### Minor Changes

- b496d6d: Use Vercel Edge API routes

## 3.1.1

### Patch Changes

- Properly define NODE_ENV and APP_ENV in esbuild config

## 3.1.0

### Minor Changes

- - Fix tooltip not rendering on first hover
  - Fix tooltip not rendering fast enough
  - Update realm select page
  - General code improvement
