/**
 * UnitDownIAPPlugin.swift
 *
 * Capacitor plugin that bridges StoreKit 2 purchases to the JavaScript layer.
 *
 * Installation (in Xcode, outside Replit):
 *   1. Copy this file into ios/App/App/ in your Xcode project.
 *   2. Enable "In-App Purchase" capability on the App target.
 *   3. Create product com.unitdown.ai.pro.monthly in App Store Connect.
 *   4. Run: npx cap sync
 *
 * This plugin exposes four methods to JavaScript:
 *   - getProducts({ productIds })
 *   - purchaseProduct({ productId })
 *   - restoreTransactions()
 *   - finishTransaction({ transactionId, productId })
 */

import Capacitor
import StoreKit

@objc(UnitDownIAPPlugin)
public class UnitDownIAPPlugin: CAPPlugin {

    // MARK: – getProducts

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("productIds array is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                let mapped = products.map { p -> [String: Any] in
                    return [
                        "productId": p.id,
                        "title": p.displayName,
                        "description": p.description,
                        "price": p.displayPrice,
                        "priceAsDecimal": NSDecimalNumber(decimal: p.price).doubleValue,
                        "currencyCode": p.priceFormatStyle.currencyCode
                    ]
                }
                call.resolve(["products": mapped])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    // MARK: – purchaseProduct

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        call.resolve([
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID,
                            "state": "purchased"
                        ])
                    case .unverified(_, let error):
                        call.reject("Purchase unverified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve([
                        "transactionId": "",
                        "productId": productId,
                        "state": "cancelled"
                    ])
                case .pending:
                    call.resolve([
                        "transactionId": "",
                        "productId": productId,
                        "state": "deferred"
                    ])
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)", "PURCHASE_ERROR", error)
            }
        }
    }

    // MARK: – restoreTransactions

    @objc func restoreTransactions(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String: Any]] = []

            for await verification in Transaction.currentEntitlements {
                switch verification {
                case .verified(let transaction):
                    transactions.append([
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "state": transaction.revocationDate == nil ? "restored" : "revoked"
                    ])
                case .unverified:
                    break
                }
            }

            call.resolve(["transactions": transactions])
        }
    }

    // MARK: – finishTransaction

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionIdStr = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdStr) else {
            call.resolve()
            return
        }

        Task {
            for await verification in Transaction.all {
                if case .verified(let transaction) = verification, transaction.id == transactionId {
                    await transaction.finish()
                    break
                }
            }
            call.resolve()
        }
    }
}
