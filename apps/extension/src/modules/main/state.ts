import { proxy } from 'valtio';
import { Key } from 'w3c-keys';

export type UiState = {
  keys: Partial<Record<Key, boolean>>;
};

export const uiState = proxy<UiState>({
  keys: {},
});
