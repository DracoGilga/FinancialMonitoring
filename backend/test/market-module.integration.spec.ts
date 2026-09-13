// test/market-module.integration.spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { StockQuote } from '../src/1_entities/market/StockQuote';
import { IGetStockQuoteInputPort } from '../src/2_use_cases/market/get_stock_quote/IGetStockQuoteInputPort';
import { GetStockQuoteRequest } from '../src/2_use_cases/market/get_stock_quote/GetStockQuoteRequest';
import { IStockMarketQueryGateway } from '../src/2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { MarketController } from '../src/3_interface_adapters/controllers/market/MarketController';
import { PrismaService } from '../src/3_interface_adapters/gateways/db/PrismaService';
import { AlphaVantageGatewayImpl } from '../src/3_interface_adapters/gateways/market/AlphaVantageGatewayImpl';
import { DataBursatilGatewayImpl } from '../src/3_interface_adapters/gateways/market/DataBursatilGatewayImpl';
import { FinnhubGatewayImpl } from '../src/3_interface_adapters/gateways/market/FinnhubGatewayImpl';
import { MarketstackGatewayImpl } from '../src/3_interface_adapters/gateways/market/MarketstackGatewayImpl';
import { MassiveGatewayImpl } from '../src/3_interface_adapters/gateways/market/MassiveGatewayImpl';
import { PolygonGatewayImpl } from '../src/3_interface_adapters/gateways/market/PolygonGatewayImpl';
import { YahooFinanceGatewayImpl } from '../src/3_interface_adapters/gateways/market/YahooFinanceGatewayImpl';
import { MarketModule } from '../src/4_frameworks_and_drivers/modules/MarketModule';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const quote = new StockQuote(
  'AAPL',
  'Apple Inc.',
  110,
  100,
  98,
  new Date('2026-01-02T15:30:00.000Z'),
  new Date('2026-01-02T15:31:00.000Z'),
);

const queryGateway = (): jest.Mocked<IStockMarketQueryGateway> => ({
  getQuote: mock<IStockMarketQueryGateway['getQuote']>(),
});

describe('MarketModule integration', () => {
  let moduleRef: TestingModule;
  let yahoo: jest.Mocked<IStockMarketQueryGateway>;
  let finnhub: jest.Mocked<IStockMarketQueryGateway>;
  let alpha: jest.Mocked<IStockMarketQueryGateway>;
  let polygon: jest.Mocked<IStockMarketQueryGateway>;
  let marketstack: jest.Mocked<IStockMarketQueryGateway>;
  let massive: jest.Mocked<IStockMarketQueryGateway>;
  let dataBursatil: jest.Mocked<IStockMarketQueryGateway>;
  let createHistory: jest.MockedFunction<(args: object) => Promise<object>>;

  beforeEach(async () => {
    yahoo = queryGateway();
    finnhub = queryGateway();
    alpha = queryGateway();
    polygon = queryGateway();
    marketstack = queryGateway();
    massive = queryGateway();
    dataBursatil = queryGateway();
    createHistory = mock<(args: object) => Promise<object>>().mockResolvedValue(
      {
        id: 'history-1',
        symbol: 'AAPL',
        currentPrice: 110,
        openPrice: 100,
        closePrice: 98,
        marketTimestamp: quote.marketTimestamp,
        createdAt: quote.fetchedAt,
      },
    );

    moduleRef = await Test.createTestingModule({ imports: [MarketModule] })
      .overrideProvider(YahooFinanceGatewayImpl)
      .useValue(yahoo)
      .overrideProvider(FinnhubGatewayImpl)
      .useValue(finnhub)
      .overrideProvider(AlphaVantageGatewayImpl)
      .useValue(alpha)
      .overrideProvider(PolygonGatewayImpl)
      .useValue(polygon)
      .overrideProvider(MarketstackGatewayImpl)
      .useValue(marketstack)
      .overrideProvider(MassiveGatewayImpl)
      .useValue(massive)
      .overrideProvider(DataBursatilGatewayImpl)
      .useValue(dataBursatil)
      .overrideProvider(PrismaService)
      .useValue({ stockHistory: { create: createHistory } })
      .compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('wires controller, resilient gateway, interactor, presenter and persistence', async () => {
    yahoo.getQuote.mockRejectedValue(new Error('Yahoo unavailable'));
    finnhub.getQuote.mockResolvedValue(quote);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const controller = moduleRef.get(MarketController);

    await expect(controller.getStockQuote({ symbol: 'aapl' })).resolves.toEqual(
      {
        status: 'success',
        data: {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          currentPrice: 110,
          dailyVariation: 10,
          dailyVariationPercentage: 0.1,
          marketTimestamp: quote.marketTimestamp,
        },
      },
    );
    expect(yahoo.getQuote).toHaveBeenCalledWith('AAPL');
    expect(finnhub.getQuote).toHaveBeenCalledWith('AAPL');
    expect(createHistory).toHaveBeenCalledTimes(1);
  });

  it('exposes the Clean Architecture input and query ports', () => {
    expect(
      moduleRef.get<IGetStockQuoteInputPort>('IGetStockQuoteInputPort'),
    ).toBeDefined();
    expect(
      moduleRef.get<IStockMarketQueryGateway>('IStockMarketQueryGateway'),
    ).toBeDefined();
  });

  it('routes Mexican symbols through DataBursatil in the composed module', async () => {
    dataBursatil.getQuote.mockResolvedValue(quote);
    const useCase = moduleRef.get<IGetStockQuoteInputPort>(
      'IGetStockQuoteInputPort',
    );

    await expect(
      useCase.execute(new GetStockQuoteRequest('WALMEX.MX')),
    ).resolves.toMatchObject({ status: 'success' });
    expect(dataBursatil.getQuote).toHaveBeenCalledWith('WALMEX.MX');
    expect(yahoo.getQuote).not.toHaveBeenCalled();
  });
});

describe('MarketModule provider factories', () => {
  const apiKeys = {
    FINNHUB_API_KEY: 'finnhub-test-key',
    ALPHA_VANTAGE_API_KEY: 'alpha-test-key',
    POLYGON_API_KEY: 'polygon-test-key',
    MARKETSTACK_API_KEY: 'marketstack-test-key',
    MASSIVE_API_KEY: 'massive-test-key',
    DATABURSATIL_API_KEY: 'data-bursatil-test-key',
  };
  const previousValues: Record<string, string | undefined> = {};
  let moduleRef: TestingModule;

  beforeEach(async () => {
    for (const [name, value] of Object.entries(apiKeys)) {
      previousValues[name] = process.env[name];
      process.env[name] = value;
    }

    moduleRef = await Test.createTestingModule({ imports: [MarketModule] })
      .overrideProvider(PrismaService)
      .useValue({ stockHistory: { create: jest.fn() } })
      .compile();
  });

  afterEach(async () => {
    await moduleRef.close();
    for (const name of Object.keys(apiKeys)) {
      const previousValue = previousValues[name];
      if (previousValue === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousValue;
      }
    }
  });

  it('constructs every concrete provider from environment configuration', () => {
    expect(moduleRef.get(YahooFinanceGatewayImpl)).toBeInstanceOf(
      YahooFinanceGatewayImpl,
    );
    expect(moduleRef.get(FinnhubGatewayImpl)).toBeInstanceOf(
      FinnhubGatewayImpl,
    );
    expect(moduleRef.get(AlphaVantageGatewayImpl)).toBeInstanceOf(
      AlphaVantageGatewayImpl,
    );
    expect(moduleRef.get(PolygonGatewayImpl)).toBeInstanceOf(
      PolygonGatewayImpl,
    );
    expect(moduleRef.get(MarketstackGatewayImpl)).toBeInstanceOf(
      MarketstackGatewayImpl,
    );
    expect(moduleRef.get(MassiveGatewayImpl)).toBeInstanceOf(
      MassiveGatewayImpl,
    );
    expect(moduleRef.get(DataBursatilGatewayImpl)).toBeInstanceOf(
      DataBursatilGatewayImpl,
    );
  });
});
