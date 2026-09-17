import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';
import { IStockMarketQueryGateway } from '../shared_ports/IStockMarketQueryGateway';
import { ISearchSymbolsInputPort } from './ISearchSymbolsInputPort';

export class SearchSymbolsUseCase implements ISearchSymbolsInputPort {
  constructor(private readonly marketGateway: IStockMarketQueryGateway) {}

  async execute(query: string): Promise<SymbolSearchResult[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    return this.marketGateway.searchSymbols(normalizedQuery);
  }
}
