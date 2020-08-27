export type UiStore = UiState;

export type UiState = {
  keys: Record<string, boolean>;
  shownTip: Record<string, boolean>;
}
