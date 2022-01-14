// import { LoggerModule } from 'nestjs-pino';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import Items_v1_Module from 'modules/v1/Item';
import Retail_v1_Module from 'modules/v1/Retail';

import Items_v2_Module from 'modules/v2/Items';


@Module({
  imports: [
    // LoggerModule.forRoot({
    //   pinoHttp: {
    //     prettyPrint: true,
    //   },
    // }),
    ThrottlerModule.forRoot({
      ttl: 10,
      limit: 10,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    Items_v1_Module,
    Items_v2_Module,
    Retail_v1_Module,
  ],
})
export default class ApplicationModule {}
