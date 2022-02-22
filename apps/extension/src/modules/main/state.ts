import { proxy } from 'valtio';

export const uiState = proxy<{ keys: Record<string, boolean> }>({
  keys: {},
});
