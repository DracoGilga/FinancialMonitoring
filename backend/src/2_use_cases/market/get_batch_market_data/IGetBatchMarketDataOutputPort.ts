import {
  BatchMarketData,
  GetBatchMarketDataResponse,
} from './GetBatchMarketDataResponse';

export interface IGetBatchMarketDataOutputPort {
  presentSuccess(data: BatchMarketData[]): GetBatchMarketDataResponse;
  presentError(error: Error): GetBatchMarketDataResponse;
}
