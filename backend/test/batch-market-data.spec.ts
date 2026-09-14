import { describe, expect, it, jest } from '@jest/globals';
import { StockQuote } from '../src/1_entities/market/StockQuote';
import { GetBatchMarketDataInteractor } from '../src/2_use_cases/market/get_batch_market_data/GetBatchMarketDataInteractor';
import { GetBatchMarketDataRequest } from '../src/2_use_cases/market/get_batch_market_data/GetBatchMarketDataRequest';
import {
  IBatchMarketDataGateway,
  IHistoricalMarketDataRepository,
  IIntradayMarketDataCache,
} from '../src/2_use_cases/market/get_batch_market_data/IBatchMarketDataGateway';
import { BatchMarketDataPresenter } from '../src/3_interface_adapters/presenters/market/BatchMarketDataPresenter';
import { RedisCacheGatewayImpl } from '../src/3_interface_adapters/gateways/market/RedisCacheGatewayImpl';

const point = (symbol: string, interval: '1d' | '5m', date: Date) =>
  new StockQuote(
    symbol,
    symbol,
    110,
    100,
    105,
    date,
    new Date('2026-09-13T12:00:00.000Z'),
    115,
    95,
    1_000,
    interval,
  );

const mock = <T extends (...args: never[]) => unknown>() => jest.fn<T>();

describe('GetBatchMarketData', () => {
  it('normalizes query symbols and uses defaults only when absent', () => {
    expect(new GetBatchMarketDataRequest('aapl, amzn,AAPL').symbols).toEqual([
      'AAPL',
      'AMZN',
    ]);
    expect(new GetBatchMarketDataRequest().symbols).toEqual([
      'AAPL',
      'AMZN',
      'MSFT',
      'GOOGL',
      'TSLA',
    ]);
  });

  it('persists every historical point and caches fetched intraday points', async () => {
    const historical = [
      point('AAPL', '1d', new Date('2025-09-13T00:00:00.000Z')),
      point('AAPL', '1d', new Date('2025-09-14T00:00:00.000Z')),
    ];
    const intraday = [
      point('AAPL', '5m', new Date('2026-09-13T15:30:00.000Z')),
    ];
    const gateway: jest.Mocked<IBatchMarketDataGateway> = {
      getHistoricalData:
        mock<IBatchMarketDataGateway['getHistoricalData']>().mockResolvedValue(
          historical,
        ),
      getIntradayData:
        mock<IBatchMarketDataGateway['getIntradayData']>().mockResolvedValue(
          intraday,
        ),
    };
    const repository: jest.Mocked<IHistoricalMarketDataRepository> = {
      saveHistorical:
        mock<
          IHistoricalMarketDataRepository['saveHistorical']
        >().mockResolvedValue(undefined),
    };
    const cache: jest.Mocked<IIntradayMarketDataCache> = {
      getIntraday:
        mock<IIntradayMarketDataCache['getIntraday']>().mockResolvedValue(null),
      saveIntraday:
        mock<IIntradayMarketDataCache['saveIntraday']>().mockResolvedValue(
          undefined,
        ),
    };
    const interactor = new GetBatchMarketDataInteractor(
      gateway,
      repository,
      cache,
      new BatchMarketDataPresenter(),
    );

    await expect(
      interactor.execute(new GetBatchMarketDataRequest('AAPL')),
    ).resolves.toEqual({
      status: 'success',
      data: [{ symbol: 'AAPL', historical, intraday }],
    });
    expect(repository.saveHistorical).toHaveBeenCalledWith(historical);
    expect(cache.saveIntraday).toHaveBeenCalledWith('AAPL', intraday);
  });

  it('uses 24 hours normally and 72 hours for Friday timestamps', () => {
    expect(
      RedisCacheGatewayImpl.calculateTtl(new Date('2026-09-10T15:30:00.000Z')),
    ).toBe(86_400);
    expect(
      RedisCacheGatewayImpl.calculateTtl(new Date('2026-09-11T15:30:00.000Z')),
    ).toBe(259_200);
  });
});
