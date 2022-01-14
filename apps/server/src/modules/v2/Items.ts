import { CacheModule, Module } from '@nestjs/common';

import ItemsController from 'controllers/v2/Items';
import ItemsService from 'services/v2/Items';

@Module({
  imports: [
    CacheModule.register(),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export default class ItemsModule {}
