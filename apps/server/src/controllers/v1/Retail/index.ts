// import { PinoLogger } from 'nestjs-pino';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import RetailService from 'services/v1/Retail';
import * as v from './validation';


@Controller('retail')
export default class RetailController {
  constructor(
    // private readonly logger: PinoLogger,
    private readonly retailService: RetailService,
  ) {
    // logger.setContext(RetailController.name);
  }

  @Get('realms/:region')
  @UseGuards(ThrottlerGuard)
  async retailRealms(@Param() params: v.RetailRealmsParams) {
    return this.retailService.getAllRealms(params.region);
  }
}
