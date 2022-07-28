import * as i from 'types';
import type { ItemBody, ItemsBody } from '@project/validation';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import ItemsService from 'services/v2/Items';
import { ItemParams } from './validation';


@Controller('/items')
export default class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
  ) {}

  @Get('/')
  @UseGuards(ThrottlerGuard)
  async itemsGet(@Body() body: ItemsBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.items(body, query);
  }

  @Post('/')
  @UseGuards(ThrottlerGuard)
  async itemsPost(@Body() body: ItemsBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.items(body, query);
  }

  @Get('/:id')
  @UseGuards(ThrottlerGuard)
  async itemGet(@Param() params: ItemParams, @Body() body: ItemBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.item(params, body, query);
  }

  @Post('/:id')
  @UseGuards(ThrottlerGuard)
  async itemPost(@Param() params: ItemParams, @Body() body: ItemBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.item(params, body, query);
  }
}
