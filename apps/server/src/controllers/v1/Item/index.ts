// import { PinoLogger } from 'nestjs-pino';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import ItemService from 'services/v1/Item';
import * as v from './validation';


@Controller('item')
export default class ItemController {
  constructor(
    // private readonly logger: PinoLogger,
    private readonly itemService: ItemService,
  ) {
    // logger.setContext(ItemController.name);
  }

  @Get(':server_name/:faction/:item_id')
  @UseGuards(ThrottlerGuard)
  async findOne(@Param() params: v.FindOneParams) {
    // this.logger.info(`Find ${params.item_id} for ${params.server_name}-${params.faction}`);

    return this.itemService.findOne(params);
  }

  @Get('multi/:server_name/:faction/:items')
  @UseGuards(ThrottlerGuard)
  async findMultiple(@Param() params: v.FindMultipleParams) {
    // this.logger.info(`Find multiple ${params.items} for ${params.server_name}-${params.faction}`);

    return this.itemService.findMultiple(params);
  }

  @Get('retail/:region/:server_name/:item_id')
  @UseGuards(ThrottlerGuard)
  async retailFindOne(@Param() params: v.RetailFindOneParams) {
    return this.itemService.retailFindOne(params);
  }

  @Get('retail/multi/:region/:server_name/:item_ids')
  @UseGuards(ThrottlerGuard)
  async retailFindMutliple(@Param() params: v.RetailFindMultipleParams) {
    return this.itemService.retailFindMultiple(params);
  }
}
