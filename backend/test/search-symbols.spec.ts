import { describe, expect, it, jest } from '@jest/globals';
import { SymbolSearchResult } from '../src/1_entities/market/SymbolSearchResult';
import { SearchSymbolsUseCase } from '../src/2_use_cases/market/search_symbols/SearchSymbolsUseCase';
import { IStockMarketQueryGateway } from '../src/2_use_cases/market/shared_ports/IStockMarketQueryGateway';

const mock = <T extends (...args: never[]) => unknown>() => jest.fn<T>();

describe('SearchSymbolsUseCase', () => {
  it('trims the query and returns normalized gateway results', async () => {
    const result = new SymbolSearchResult(
      'AAPL',
      'Apple Inc.',
      'NASDAQ',
      'Equity',
    );
    const gateway: jest.Mocked<IStockMarketQueryGateway> = {
      getQuote: mock<IStockMarketQueryGateway['getQuote']>(),
      searchSymbols:
        mock<IStockMarketQueryGateway['searchSymbols']>().mockResolvedValue([
          result,
        ]),
    };
    const useCase = new SearchSymbolsUseCase(gateway);

    await expect(useCase.execute('  Apple  ')).resolves.toEqual([result]);
    expect(gateway.searchSymbols).toHaveBeenCalledWith('Apple');
  });

  it('does not call the gateway for a blank query', async () => {
    const gateway: jest.Mocked<IStockMarketQueryGateway> = {
      getQuote: mock<IStockMarketQueryGateway['getQuote']>(),
      searchSymbols: mock<IStockMarketQueryGateway['searchSymbols']>(),
    };
    const useCase = new SearchSymbolsUseCase(gateway);

    await expect(useCase.execute('   ')).resolves.toEqual([]);
    expect(gateway.searchSymbols).not.toHaveBeenCalled();
  });
});
