/* eslint-disable @typescript-eslint/indent */
import * as i from 'types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEnum, IsNumber, IsNumberString, IsOptional, IsString, Max, Min,
  ValidateNested, ArrayMaxSize,
} from 'class-validator';

export class ItemsArrayObject {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  amount?: number;

  @IsString()
  server_name: string;

  @IsEnum(['alliance', 'horde'])
  faction: i.Factions;
}

export class ItemsBody {
  @IsArray()
  @Type(() => ItemsArrayObject)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  items: ItemsArrayObject[];
}

export class ItemBody {
  @IsString()
  server_name: string;

  @IsEnum(['alliance', 'horde'])
  faction: i.Factions;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  amount?: number;
}

export class ItemParams {
  @IsNumberString()
  id: string;
}
