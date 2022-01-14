/* eslint-disable @typescript-eslint/indent */
import { IsEnum } from 'class-validator';
import { RegionName } from 'blizzapi';


export class RetailRealmsParams {
  @IsEnum(['eu', 'us', 'kr', 'tw'])
  region: RegionName;
}
