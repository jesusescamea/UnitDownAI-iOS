/**
 * UnitDownIAPPlugin.m
 *
 * Objective-C bridge that registers the UnitDownIAPPlugin Swift class and its
 * methods with the Capacitor runtime. This file is required alongside
 * UnitDownIAPPlugin.swift — without it, registerPlugin("UnitDownIAP") in
 * JavaScript cannot find the native implementation and falls through to the
 * web stub, making StoreKit unavailable.
 *
 * Installation: Copy both UnitDownIAPPlugin.swift and this file into
 * ios/App/App/ in your Xcode project. No other registration is needed.
 */

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(UnitDownIAPPlugin, "UnitDownIAP",
  CAP_PLUGIN_METHOD(getProducts, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(purchaseProduct, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(restoreTransactions, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(finishTransaction, CAPPluginReturnPromise);
)
