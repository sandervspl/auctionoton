import { CacheModule, Module } from '@nestjs/common';

import ItemController from 'controllers/v1/Item';
import ItemService from 'services/v1/Item';
import RetailService from 'services/v1/Retail';


@Module({
  imports: [
    CacheModule.register(),
  ],
  controllers: [ItemController],
  providers: [ItemService, RetailService],
})
export default class ItemModule {}
