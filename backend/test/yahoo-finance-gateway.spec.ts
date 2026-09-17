// test/yahoo-finance-gateway.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { YahooFinanceGatewayImpl } from '../src/3_interface_adapters/gateways/market/YahooFinanceGatewayImpl';
import {
  MarketServiceUnavailableException,
  ProviderRateLimitException,
  SymbolNotFoundException,
} from '../src/1_entities/market/MarketExceptions';

type YahooQuote = {
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: Date;
};

type YahooSearchResponse = {
  quotes: Array<{
    symbol?: string;
    longname?: string;
    shortname?: string;
    exchDisp?: string;
    exchange?: string;
    typeDisp?: string;
    quoteType?: string;
  }>;
};

type YahooClient = {
  quote(symbol: string): Promise<YahooQuote>;
  search?(query: string): Promise<YahooSearchResponse>;
};

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const client = (result: YahooQuote): jest.Mocked<YahooClient> => ({
  quote: mock<YahooClient['quote']>().mockResolvedValue(result),
});

describe('YahooFinanceGatewayImpl', () => {
  it('maps normalized search symbols and metadata', async () => {
    const yahoo: jest.Mocked<YahooClient> = {
      quote: mock<YahooClient['quote']>(),
      search: mock<NonNullable<YahooClient['search']>>().mockResolvedValue({
        quotes: [
          {
            symbol: 'aapl',
            longname: 'Apple Inc.',
            exchDisp: 'NASDAQ',
            typeDisp: 'Equity',
          },
          {
            symbol: 'AAPL240119C00150000',
            shortname: 'Apple Call',
            exchange: 'OPR',
            quoteType: 'OPTION',
          },
          { longname: 'Unsupported result without a symbol' },
        ],
      }),
    };
    const gateway = new YahooFinanceGatewayImpl(yahoo);

    await expect(gateway.searchSymbols('Apple')).resolves.toEqual([
      {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        exchange: 'NASDAQ',
        instrumentType: 'Equity',
      },
      {
        symbol: 'AAPL240119C00150000',
        companyName: 'Apple Call',
        exchange: 'OPR',
        instrumentType: 'OPTION',
      },
    ]);
    expect(yahoo.search).toHaveBeenCalledWith('Apple');
  });

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

  it('classifies missing quotes, throttling and provider failures', async () => {
    const missing = new YahooFinanceGatewayImpl(client({}));
    await expect(missing.getQuote('NONE')).rejects.toBeInstanceOf(
      SymbolNotFoundException,
    );

    const failedClient: jest.Mocked<YahooClient> = {
      quote: mock<YahooClient['quote']>().mockRejectedValue(
        new Error('service unavailable'),
      ),
    };
    await expect(
      new YahooFinanceGatewayImpl(failedClient).getQuote('AAPL'),
    ).rejects.toBeInstanceOf(MarketServiceUnavailableException);

    failedClient.quote.mockRejectedValue(
      new Error('HTTP 429 Too Many Requests'),
    );
    await expect(
      new YahooFinanceGatewayImpl(failedClient).getQuote('AAPL'),
    ).rejects.toBeInstanceOf(ProviderRateLimitException);

    failedClient.quote.mockRejectedValue('failure');
    await expect(
      new YahooFinanceGatewayImpl(failedClient).getQuote('AAPL'),
    ).rejects.toBeInstanceOf(MarketServiceUnavailableException);
  });
});
