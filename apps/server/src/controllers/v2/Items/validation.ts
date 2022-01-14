/* eslint-disable @typescript-eslint/indent */
import { IsNumberString } from 'class-validator';

export class ItemParams {
  @IsNumberString()
  id: string;
}
