import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  MarketDomainException,
  MarketServiceUnavailableException,
  ProviderRateLimitException,
  SymbolNotFoundException,
} from '../../../../1_entities/market/MarketExceptions';

@Catch(MarketDomainException)
export class MarketExceptionFilter implements ExceptionFilter {
  catch(exception: MarketDomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.getStatus(exception);

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status],
      message: exception.message,
    });
  }

  private getStatus(exception: MarketDomainException): HttpStatus {
    if (exception instanceof SymbolNotFoundException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof ProviderRateLimitException) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }
    if (exception instanceof MarketServiceUnavailableException) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
}
