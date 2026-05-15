/**
 * Web stub for the UnitDownIAP Capacitor plugin.
 * This runs on web/browser so Capacitor's registerPlugin() doesn't throw.
 * All methods return empty/no-op results.
 */
export class UnitDownIAPWebStub {
  async getProducts(_options: { productIds: string[] }) {
    return { products: [] };
  }

  async purchaseProduct(_options: { productId: string }) {
    return { transactionId: "", productId: _options.productId, state: "cancelled" };
  }

  async restoreTransactions() {
    return { transactions: [] };
  }

  async finishTransaction(_options: { transactionId: string; productId: string }) {
    return;
  }
}
