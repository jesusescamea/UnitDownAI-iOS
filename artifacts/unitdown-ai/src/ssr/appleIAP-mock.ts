export const IAP_PRODUCT_ID = "com.unitdown.subscription.monthly";

export function checkIAPSubscriptionActive(): boolean {
  return false;
}

export async function purchasePro() {
  return { success: false, cancelled: true };
}

export async function restorePurchases() {
  return { success: true, restoredProductIds: [] };
}

export async function getIAPProducts() {
  return [];
}
