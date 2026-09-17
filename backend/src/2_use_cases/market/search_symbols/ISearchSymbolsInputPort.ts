import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

export interface ISearchSymbolsInputPort {
  execute(query: string): Promise<SymbolSearchResult[]>;
}
