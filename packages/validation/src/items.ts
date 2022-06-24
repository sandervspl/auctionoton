/* eslint-disable @typescript-eslint/indent */
import { Factions } from '@project/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested, ArrayMaxSize,
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
  faction: Factions;
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
  faction: Factions;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  amount?: number;
}
