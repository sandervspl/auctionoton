import * as i from 'types';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import ItemsService from 'services/v2/Items';
import * as v from './validation';


@Controller('items')
export default class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
  ) {}

  @Get('/')
  @UseGuards(ThrottlerGuard)
  async itemsGet(@Body() body: v.ItemsBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.items(body, query);
  }

  @Post('/')
  @UseGuards(ThrottlerGuard)
  async itemsPost(@Body() body: v.ItemsBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.items(body, query);
  }

  @Get('/:id')
  @UseGuards(ThrottlerGuard)
  async itemGet(@Param() params: v.ItemParams, @Body() body: v.ItemBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.item(params, body, query);
  }

  @Post('/:id')
  @UseGuards(ThrottlerGuard)
  async itemPost(@Param() params: v.ItemParams, @Body() body: v.ItemBody, @Query() query?: i.ItemRequestQuery) {
    return this.itemsService.item(params, body, query);
  }
}
