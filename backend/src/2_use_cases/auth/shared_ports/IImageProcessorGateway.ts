// src/2_use_cases/auth/shared_ports/IImageProcessorGateway.ts
export interface IImageProcessorGateway {
  sanitizeAndProcess(buffer: Buffer): Promise<Buffer>;
}
