/**
 * Web stub for the UnitDownIAP Capacitor plugin.
 *
 * This runs in two situations:
 *   1. In a desktop/mobile browser (expected — Stripe is used on web instead).
 *   2. On iOS inside Capacitor when the native UnitDownIAPPlugin Swift file is
 *      NOT registered in the Xcode project (unexpected — means the plugin is
 *      missing and purchases will never work).
 *
 * getProducts() returns an empty array so the modal can detect the failure.
 * purchaseProduct() and restoreTransactions() throw so the error surfaces in
 * the UI rather than silently looking like a user cancellation.
 */
export class UnitDownIAPWebStub {
  async getProducts(_options: { productIds: string[] }) {
    // Return empty — callers check for empty array to detect unavailability.
    return { products: [] };
  }

  async purchaseProduct(_options: { productId: string }): Promise<never> {
    throw new Error(
      "In-app purchases are not available on this platform. " +
      "If you are on iOS, the native UnitDownIAP plugin may not be installed in Xcode. " +
      "Please contact support.",
    );
  }

  async restoreTransactions(): Promise<never> {
    throw new Error(
      "Restore purchases is not available on this platform. " +
      "If you are on iOS, the native UnitDownIAP plugin may not be installed in Xcode. " +
      "Please contact support.",
    );
  }

  async finishTransaction(_options: { transactionId: string; productId: string }) {
    return;
  }
}
