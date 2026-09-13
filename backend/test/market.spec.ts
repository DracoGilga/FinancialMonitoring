// test/market.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import { validate } from 'class-validator';
import { MonitoredStock } from '../src/1_entities/market/MonitoredStock';
import { StockQuote } from '../src/1_entities/market/StockQuote';
import { GetStockQuoteInteractor } from '../src/2_use_cases/market/get_stock_quote/GetStockQuoteInteractor';
import { GetStockQuoteRequest } from '../src/2_use_cases/market/get_stock_quote/GetStockQuoteRequest';
import { GetStockQuoteResponse } from '../src/2_use_cases/market/get_stock_quote/GetStockQuoteResponse';
import { IMarketCommandGateway } from '../src/2_use_cases/market/shared_ports/IMarketCommandGateway';
import { IStockMarketQueryGateway } from '../src/2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { MarketController } from '../src/3_interface_adapters/controllers/market/MarketController';
import { GetStockDto } from '../src/3_interface_adapters/controllers/market/dto/GetStockDto';
import { StockQuotePresenter } from '../src/3_interface_adapters/presenters/market/StockQuotePresenter';

const mock = <T extends (...args: never[]) => unknown>(implementation?: T) =>
  jest.fn<T>(implementation);

const marketTime = new Date('2026-01-02T15:30:00.000Z');
const fetchedAt = new Date('2026-01-02T15:31:00.000Z');
const quote = () =>
  new StockQuote('AAPL', 'Apple Inc.', 110, 100, 98, marketTime, fetchedAt);

const gatewayMock = (): jest.Mocked<IStockMarketQueryGateway> => ({
  getQuote: mock<IStockMarketQueryGateway['getQuote']>(),
});

const commandMock = (): jest.Mocked<IMarketCommandGateway> => ({
  saveQuote: mock<IMarketCommandGateway['saveQuote']>(),
});

describe('market entities and models', () => {
  it('calculates variation, percentage, direction and symbol validity', () => {
    const stock = quote();

    expect(stock.getDailyVariation()).toBe(10);
    expect(stock.getDailyVariationPercentage()).toBe(0.1);
    expect(stock.isMarketUp()).toBe(true);
    expect(stock.isValidSymbol()).toBe(true);
  });

  it('handles zero opening price, falling markets and invalid symbols', () => {
    const stock = new StockQuote(
      'INVALID1',
      'Invalid',
      -1,
      0,
      0,
      marketTime,
      fetchedAt,
    );

    expect(stock.getDailyVariationPercentage()).toBe(0);
    expect(stock.isMarketUp()).toBe(false);
    expect(stock.isValidSymbol()).toBe(false);
  });

  it('deactivates a monitored stock without mutating it', () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const stock = new MonitoredStock(
      'stock-1',
      'AAPL',
      'Apple Inc.',
      true,
      createdAt,
    );

    expect(stock.deactivate()).toEqual(
      new MonitoredStock('stock-1', 'AAPL', 'Apple Inc.', false, createdAt),
    );
    expect(stock.isActive).toBe(true);
  });

  it('retains request and response values', () => {
    expect(new GetStockQuoteRequest('AAPL').symbol).toBe('AAPL');
    expect(
      new GetStockQuoteResponse('error', undefined, 'failed'),
    ).toMatchObject({ status: 'error', message: 'failed' });
  });
});

describe('GetStockQuoteInteractor and presenter', () => {
  const presenter = new StockQuotePresenter();

  it('retrieves, persists and presents a quote', async () => {
    const query = gatewayMock();
    const command = commandMock();
    query.getQuote.mockResolvedValue(quote());
    const interactor = new GetStockQuoteInteractor(query, command, presenter);

    const result = await interactor.execute(new GetStockQuoteRequest('AAPL'));

    expect(query.getQuote).toHaveBeenCalledWith('AAPL');
    expect(command.saveQuote).toHaveBeenCalledWith(quote());
    expect(result).toEqual({
      status: 'success',
      data: {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        currentPrice: 110,
        dailyVariation: 10,
        dailyVariationPercentage: 0.1,
        marketTimestamp: marketTime,
      },
    });
  });

  it('presents provider errors and does not persist', async () => {
    const query = gatewayMock();
    const command = commandMock();
    query.getQuote.mockRejectedValue(new Error('provider failed'));
    const interactor = new GetStockQuoteInteractor(query, command, presenter);

    await expect(
      interactor.execute(new GetStockQuoteRequest('FAIL')),
    ).resolves.toEqual({ status: 'error', message: 'provider failed' });
    expect(command.saveQuote).not.toHaveBeenCalled();
  });

  it('normalizes non-Error persistence failures', async () => {
    const query = gatewayMock();
    const command = commandMock();
    query.getQuote.mockResolvedValue(quote());
    command.saveQuote.mockRejectedValue('failure');
    const interactor = new GetStockQuoteInteractor(query, command, presenter);

    await expect(
      interactor.execute(new GetStockQuoteRequest('AAPL')),
    ).resolves.toEqual({ status: 'error', message: 'Unknown error' });
  });

  it('presents an error view model', () => {
    expect(presenter.presentError(new Error('market error'))).toEqual({
      status: 'error',
      message: 'market error',
    });
  });
});

describe('MarketController and GetStockDto', () => {
  const success = new GetStockQuoteResponse('success', {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    currentPrice: 110,
    dailyVariation: 10,
    dailyVariationPercentage: 0.1,
    marketTimestamp: marketTime,
  });

  it('normalizes the symbol and returns the use-case response', async () => {
    const useCase = {
      execute:
        mock<
          (request: GetStockQuoteRequest) => Promise<GetStockQuoteResponse>
        >().mockResolvedValue(success),
    };
    const controller = new MarketController(useCase);

    await expect(controller.getStockQuote({ symbol: 'aapl' })).resolves.toBe(
      success,
    );
    expect(useCase.execute).toHaveBeenCalledWith(
      new GetStockQuoteRequest('AAPL'),
    );
  });

  it.each([
    [new GetStockQuoteResponse('error', undefined, 'not found'), 'not found'],
    [new GetStockQuoteResponse('error'), 'Error fetching stock data'],
  ])('converts errors into HTTP 400 responses', async (result, message) => {
    const useCase = {
      execute:
        mock<
          (request: GetStockQuoteRequest) => Promise<GetStockQuoteResponse>
        >().mockResolvedValue(result),
    };
    const controller = new MarketController(useCase);

    try {
      await controller.getStockQuote({ symbol: 'FAIL' });
      throw new Error('Expected controller to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
      expect((error as HttpException).message).toBe(message);
    }
  });

  it.each([
    ['AAPL', 0],
    ['', 1],
    ['TOOLONG', 1],
    ['aa', 1],
    ['A1', 1],
  ])('validates symbol %s', async (symbol, expectedErrors) => {
    const dto = new GetStockDto();
    dto.symbol = symbol;

    expect(await validate(dto)).toHaveLength(expectedErrors);
  });
});
