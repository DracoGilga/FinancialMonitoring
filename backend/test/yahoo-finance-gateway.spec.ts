// test/yahoo-finance-gateway.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { YahooFinanceGatewayImpl } from '../src/3_interface_adapters/gateways/market/YahooFinanceGatewayImpl';

type YahooQuote = {
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: Date;
};

type YahooClient = {
  quote(symbol: string): Promise<YahooQuote>;
};

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const client = (result: YahooQuote): jest.Mocked<YahooClient> => ({
  quote: mock<YahooClient['quote']>().mockResolvedValue(result),
});

describe('YahooFinanceGatewayImpl', () => {
  it('maps the complete Yahoo quote', async () => {
    const marketTime = new Date('2026-01-02T15:30:00.000Z');
    const yahoo = client({
      longName: 'Apple Inc.',
      shortName: 'Apple',
      regularMarketPrice: 110,
      regularMarketOpen: 100,
      regularMarketPreviousClose: 98,
      regularMarketTime: marketTime,
    });
    const gateway = new YahooFinanceGatewayImpl(yahoo);

    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      currentPrice: 110,
      openPrice: 100,
      closePrice: 98,
      marketTimestamp: marketTime,
    });
    expect(yahoo.quote).toHaveBeenCalledWith('aapl');
  });

  it('uses short name and price defaults for optional values', async () => {
    const gateway = new YahooFinanceGatewayImpl(
      client({ shortName: 'Apple', regularMarketPrice: 110 }),
    );

    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      companyName: 'Apple',
      openPrice: 110,
      closePrice: 110,
    });
  });

  it('uses the symbol when Yahoo omits company names', async () => {
    const gateway = new YahooFinanceGatewayImpl(
      client({ regularMarketPrice: 110 }),
    );

    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      companyName: 'AAPL',
    });
  });

  it('wraps missing quotes, Error failures and non-Error failures', async () => {
    const missing = new YahooFinanceGatewayImpl(client({}));
    await expect(missing.getQuote('NONE')).rejects.toThrow(
      'Yahoo Finance API Error: Symbol NONE not found or market closed on Yahoo Finance',
    );

    const failedClient: jest.Mocked<YahooClient> = {
      quote: mock<YahooClient['quote']>().mockRejectedValue(
        new Error('service unavailable'),
      ),
    };
    await expect(
      new YahooFinanceGatewayImpl(failedClient).getQuote('AAPL'),
    ).rejects.toThrow('Yahoo Finance API Error: service unavailable');

    failedClient.quote.mockRejectedValue('failure');
    await expect(
      new YahooFinanceGatewayImpl(failedClient).getQuote('AAPL'),
    ).rejects.toThrow('Yahoo Finance API Error: undefined');
  });
});
