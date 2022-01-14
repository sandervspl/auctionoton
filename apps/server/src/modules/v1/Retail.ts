import { Module } from '@nestjs/common';
import RetailController from 'controllers/v1/Retail';
import RetailService from 'services/v1/Retail';

@Module({
  controllers: [RetailController],
  providers: [RetailService],
})
export default class RetailModule {}
