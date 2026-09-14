// src/4_frameworks_and_drivers/modules/MarketModule.ts
import { Module } from '@nestjs/common';
import { MarketController } from '../../3_interface_adapters/controllers/market/MarketController';
import { GetStockQuoteInteractor } from '../../2_use_cases/market/get_stock_quote/GetStockQuoteInteractor';
import { StockQuotePresenter } from '../../3_interface_adapters/presenters/market/StockQuotePresenter';
import { MarketCommandGatewayImpl } from '../../3_interface_adapters/gateways/market/MarketCommandGatewayImpl';
import { PrismaService } from '../../3_interface_adapters/gateways/db/PrismaService';
import { YahooFinanceGatewayImpl } from '../../3_interface_adapters/gateways/market/YahooFinanceGatewayImpl';
import { FinnhubGatewayImpl } from '../../3_interface_adapters/gateways/market/FinnhubGatewayImpl';
import { AlphaVantageGatewayImpl } from '../../3_interface_adapters/gateways/market/AlphaVantageGatewayImpl';
import { MarketstackGatewayImpl } from '../../3_interface_adapters/gateways/market/MarketstackGatewayImpl';
import { MassiveGatewayImpl } from '../../3_interface_adapters/gateways/market/MassiveGatewayImpl';
import { DataBursatilGatewayImpl } from '../../3_interface_adapters/gateways/market/DataBursatilGatewayImpl';
import { ResilientStockGatewayImpl } from '../../3_interface_adapters/gateways/market/ResilientStockGatewayImpl';
import { IStockMarketQueryGateway } from '../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { IMarketCommandGateway } from '../../2_use_cases/market/shared_ports/IMarketCommandGateway';
import { IGetStockQuoteOutputPort } from '../../2_use_cases/market/get_stock_quote/IGetStockQuoteOutputPort';
import { GetBatchMarketDataInteractor } from '../../2_use_cases/market/get_batch_market_data/GetBatchMarketDataInteractor';
import { BatchMarketDataPresenter } from '../../3_interface_adapters/presenters/market/BatchMarketDataPresenter';
import { RedisCacheGatewayImpl } from '../../3_interface_adapters/gateways/market/RedisCacheGatewayImpl';

@Module({
  controllers: [MarketController],
  providers: [
    PrismaService,
    StockQuotePresenter,
    BatchMarketDataPresenter,
    {
      provide: RedisCacheGatewayImpl,
      useFactory: () =>
        new RedisCacheGatewayImpl(
          process.env.REDIS_HOST || 'redis',
          parseInt(process.env.REDIS_PORT || '6379', 10),
          process.env.REDIS_PASSWORD,
        ),
    },
    MarketCommandGatewayImpl,
    {
      provide: 'IMarketCommandGateway',
      useExisting: MarketCommandGatewayImpl,
    },
    {
      provide: YahooFinanceGatewayImpl,
      useClass: YahooFinanceGatewayImpl,
    },
    {
      provide: FinnhubGatewayImpl,
      useFactory: () =>
        new FinnhubGatewayImpl(process.env.FINNHUB_API_KEY || ''),
    },
    {
      provide: AlphaVantageGatewayImpl,
      useFactory: () =>
        new AlphaVantageGatewayImpl(process.env.ALPHA_VANTAGE_API_KEY || ''),
    },
    {
      provide: MarketstackGatewayImpl,
      useFactory: () =>
        new MarketstackGatewayImpl(process.env.MARKETSTACK_API_KEY || ''),
    },
    {
      provide: MassiveGatewayImpl,
      useFactory: () =>
        new MassiveGatewayImpl(process.env.MASSIVE_API_KEY || ''),
    },
    {
      provide: DataBursatilGatewayImpl,
      useFactory: () =>
        new DataBursatilGatewayImpl(process.env.DATABURSATIL_API_KEY || ''),
    },

    {
      provide: 'IStockMarketQueryGateway',
      useFactory: (
        yahoo: YahooFinanceGatewayImpl,
        finnhub: FinnhubGatewayImpl,
        alpha: AlphaVantageGatewayImpl,
        marketstack: MarketstackGatewayImpl,
        massive: MassiveGatewayImpl,
        dataBursatil: DataBursatilGatewayImpl,
      ) => {
        return new ResilientStockGatewayImpl(
          yahoo,
          finnhub,
          alpha,
          marketstack,
          massive,
          dataBursatil,
        );
      },
      inject: [
        YahooFinanceGatewayImpl,
        FinnhubGatewayImpl,
        AlphaVantageGatewayImpl,
        MarketstackGatewayImpl,
        MassiveGatewayImpl,
        DataBursatilGatewayImpl,
      ],
    },

    {
      provide: 'IGetBatchMarketDataInputPort',
      useFactory: (
        yahoo: YahooFinanceGatewayImpl,
        repository: MarketCommandGatewayImpl,
        cache: RedisCacheGatewayImpl,
        presenter: BatchMarketDataPresenter,
      ) =>
        new GetBatchMarketDataInteractor(yahoo, repository, cache, presenter),
      inject: [
        YahooFinanceGatewayImpl,
        MarketCommandGatewayImpl,
        RedisCacheGatewayImpl,
        BatchMarketDataPresenter,
      ],
    },
    {
      provide: 'IGetStockQuoteInputPort',
      useFactory: (
        queryGateway: IStockMarketQueryGateway,
        commandGateway: IMarketCommandGateway,
        presenter: IGetStockQuoteOutputPort,
      ) => {
        return new GetStockQuoteInteractor(
          queryGateway,
          commandGateway,
          presenter,
        );
      },
      inject: [
        'IStockMarketQueryGateway',
        'IMarketCommandGateway',
        StockQuotePresenter,
      ],
    },
  ],
})
export class MarketModule {}
