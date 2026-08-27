import { MyWritexContractError } from "./contract";

export const PRODUCTION_LTS_ADAPTER_IMPLEMENTED = false;

/**
 * Deliberate hard stop for Stage 3B-1. This module contains no HTTP/database
 * client and cannot be activated by an environment variable.
 */
export class ProductionLTSAdapter {
  constructor() {
    throw new MyWritexContractError(
      "PRODUCTION_ADAPTER_DISABLED",
      503,
      "Production LTS integration is not implemented or authorized.",
    );
  }
}
