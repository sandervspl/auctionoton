import * as i from 'types';

export interface ItemRequestBody {
  server_name: string;
  faction: i.Factions;
  amount: number;
}
