export abstract class MarketDomainException extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SymbolNotFoundException extends MarketDomainException {
  constructor(symbol: string) {
    super(`Market symbol ${symbol.toUpperCase()} was not found`);
  }
}

export class ProviderRateLimitException extends MarketDomainException {
  constructor(provider = 'Market data provider') {
    super(`${provider} rate limit exceeded`);
  }
}

export class MarketServiceUnavailableException extends MarketDomainException {
  constructor(message = 'Market data providers are temporarily unavailable') {
    super(message);
  }
}
