/* eslint-disable @typescript-eslint/indent */
import * as i from 'types';
import { IsString, IsEnum, IsNumber, IsOptional, IsNumberString } from 'class-validator';
import { RegionName } from 'blizzapi';

export class FindOneParams {
  @IsString()
  server_name: string;

  @IsString()
  faction: i.Factions;

  @IsNumberString()
  item_id: string;

  @IsOptional()
  @IsNumber()
  amount = 1;
}

export class RetailFindOneParams {
  @IsEnum(['eu', 'us', 'kr', 'tw'])
  region: RegionName;

  @IsString()
  server_name: string; // Server name

  // BNet API only supports ID
  @IsNumberString()
  item_id: string;
}

export class RetailFindMultipleParams {
  @IsEnum(['eu', 'us', 'kr', 'tw'])
  region: RegionName;

  @IsString()
  server_name: string;

  // BNet API only supports IDs
  // i.e. 168583,5+168584,10+168585
  @IsString()
  items: string;
}

export class FindMultipleParams {
  @IsString()
  server_name: string;

  @IsString()
  faction: i.Factions;

  // i.e. 168583+171285,40
  @IsString()
  items: string;
}
