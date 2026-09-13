// test/market-resilience.spec.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StockQuote } from '../src/1_entities/market/StockQuote';
import { IStockMarketQueryGateway } from '../src/2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { PrismaService } from '../src/3_interface_adapters/gateways/db/PrismaService';
import { MarketCommandGatewayImpl } from '../src/3_interface_adapters/gateways/market/MarketCommandGatewayImpl';
import { ResilientStockGatewayImpl } from '../src/3_interface_adapters/gateways/market/ResilientStockGatewayImpl';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const stock = new StockQuote(
  'AAPL',
  'Apple Inc.',
  110,
  100,
  98,
  new Date('2026-01-02T15:30:00.000Z'),
  new Date('2026-01-02T15:31:00.000Z'),
);

const gateway = (): jest.Mocked<IStockMarketQueryGateway> => ({
  getQuote: mock<IStockMarketQueryGateway['getQuote']>(),
});

type GatewaySet = {
  yahoo: jest.Mocked<IStockMarketQueryGateway>;
  finnhub: jest.Mocked<IStockMarketQueryGateway>;
  alpha: jest.Mocked<IStockMarketQueryGateway>;
  marketstack: jest.Mocked<IStockMarketQueryGateway>;
  massive: jest.Mocked<IStockMarketQueryGateway>;
  dataBursatil: jest.Mocked<IStockMarketQueryGateway>;
};

const createResilientGateway = () => {
  const gateways: GatewaySet = {
    yahoo: gateway(),
    finnhub: gateway(),
    alpha: gateway(),
    marketstack: gateway(),
    massive: gateway(),
    dataBursatil: gateway(),
  };
  const resilient = new ResilientStockGatewayImpl(
    gateways.yahoo,
    gateways.finnhub,
    gateways.alpha,
    gateways.marketstack,
    gateways.massive,
    gateways.dataBursatil,
  );
  return { resilient, gateways };
};

describe('ResilientStockGatewayImpl', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('uses DataBursatil first for Mexican symbols', async () => {
    const { resilient, gateways } = createResilientGateway();
    gateways.dataBursatil.getQuote.mockResolvedValue(stock);

    await expect(resilient.getQuote('WALMEX.MX')).resolves.toBe(stock);
    expect(gateways.dataBursatil.getQuote).toHaveBeenCalledWith('WALMEX.MX');
    expect(gateways.yahoo.getQuote).not.toHaveBeenCalled();
  });

  it('falls back from DataBursatil through providers in the configured order', async () => {
    const { resilient, gateways } = createResilientGateway();
    gateways.dataBursatil.getQuote.mockRejectedValue(
      new Error('Mexico failed'),
    );
    gateways.yahoo.getQuote.mockRejectedValue(new Error('Yahoo failed'));
    gateways.finnhub.getQuote.mockRejectedValue(new Error('Finnhub failed'));
    gateways.alpha.getQuote.mockResolvedValue(stock);

    await expect(resilient.getQuote('WALMEX.MX')).resolves.toBe(stock);
    expect(gateways.dataBursatil.getQuote).toHaveBeenCalledTimes(1);
    expect(gateways.yahoo.getQuote).toHaveBeenCalledTimes(1);
    expect(gateways.finnhub.getQuote).toHaveBeenCalledTimes(1);
    expect(gateways.alpha.getQuote).toHaveBeenCalledTimes(1);
    expect(gateways.massive.getQuote).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(3);
  });

  it('skips DataBursatil for international symbols', async () => {
    const { resilient, gateways } = createResilientGateway();
    gateways.yahoo.getQuote.mockResolvedValue(stock);

    await expect(resilient.getQuote('AAPL')).resolves.toBe(stock);
    expect(gateways.dataBursatil.getQuote).not.toHaveBeenCalled();
  });

  it('tries every fallback and throws the fatal error when all fail', async () => {
    const { resilient, gateways } = createResilientGateway();
    for (const provider of [
      gateways.yahoo,
      gateways.finnhub,
      gateways.alpha,
      gateways.massive,
      gateways.marketstack,
    ]) {
      provider.getQuote.mockRejectedValue(new Error('failed'));
    }

    await expect(resilient.getQuote('FAIL')).rejects.toThrow(
      '[Gateway Fatal] All market APIs failed for symbol: FAIL',
    );
    expect(console.warn).toHaveBeenCalledTimes(5);
  });
});

describe('MarketCommandGatewayImpl', () => {
  type CreateStockHistory = (args: object) => Promise<object>;

  it('persists a quote using connect-or-create', async () => {
    const create = mock<CreateStockHistory>().mockResolvedValue({
      id: 'history-1',
      symbol: 'AAPL',
      currentPrice: 110,
      openPrice: 100,
      closePrice: 98,
      marketTimestamp: stock.marketTimestamp,
      createdAt: stock.fetchedAt,
    });
    const prisma = { stockHistory: { create } } as unknown as PrismaService;
    const gateway = new MarketCommandGatewayImpl(prisma);

    await expect(gateway.saveQuote(stock)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith({
      data: {
        currentPrice: 110,
        openPrice: 100,
        closePrice: 98,
        marketTimestamp: stock.marketTimestamp,
        monitoredStock: {
          connectOrCreate: {
            where: { symbol: 'AAPL' },
            create: {
              symbol: 'AAPL',
              companyName: 'Apple Inc.',
              isActive: true,
            },
          },
        },
      },
    });
  });

  it('converts database failures into an internal server error', async () => {
    const create = mock<CreateStockHistory>().mockRejectedValue(
      new Error('database unavailable'),
    );
    const prisma = { stockHistory: { create } } as unknown as PrismaService;
    const gateway = new MarketCommandGatewayImpl(prisma);

    await expect(gateway.saveQuote(stock)).rejects.toEqual(
      expect.objectContaining({
        message: 'Error saving stock quote history for AAPL in database',
      }),
    );
  });
});
