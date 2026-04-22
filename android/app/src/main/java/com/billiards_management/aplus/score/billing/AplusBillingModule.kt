package com.aplus.score.billing

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class AplusBillingModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), PurchasesUpdatedListener {

  private var billingClient: BillingClient? = null
  private var pendingPurchasePromise: Promise? = null

  override fun getName(): String = "AplusBillingModule"

  private fun getClient(): BillingClient {
    val existing = billingClient
    if (existing != null) {
      return existing
    }

    val pendingParams = PendingPurchasesParams
      .newBuilder()
      .enableOneTimeProducts()
      .build()

    val created = BillingClient
      .newBuilder(reactContext)
      .enablePendingPurchases(pendingParams)
      .setListener(this)
      .enableAutoServiceReconnection()
      .build()

    billingClient = created
    return created
  }

  private fun ensureConnected(onReady: (BillingClient) -> Unit, onError: (BillingResult) -> Unit) {
    val client = getClient()
    if (client.isReady) {
      onReady(client)
      return
    }

    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          onReady(client)
        } else {
          onError(billingResult)
        }
      }

      override fun onBillingServiceDisconnected() {
        // enableAutoServiceReconnection() lets the next Billing call reconnect automatically.
      }
    })
  }

  @ReactMethod
  fun initialize(promise: Promise) {
    ensureConnected(
      onReady = {
        queryProductsInternal(
          onSuccess = { plans ->
            val map = entitlementMap(isAvailable = true, isActive = false)
            map.putArray("plans", plans)
            promise.resolve(map)
          },
          onError = { promise.resolve(errorMap(it)) },
        )
      },
      onError = { promise.resolve(errorMap(it)) },
    )
  }

  @ReactMethod
  fun queryProducts(promise: Promise) {
    ensureConnected(
      onReady = {
        queryProductsInternal(
          onSuccess = { plans ->
            val map = entitlementMap(isAvailable = true, isActive = false)
            map.putArray("plans", plans)
            promise.resolve(map)
          },
          onError = { promise.resolve(errorMap(it)) },
        )
      },
      onError = { promise.resolve(errorMap(it)) },
    )
  }

  @ReactMethod
  fun restorePurchases(promise: Promise) {
    ensureConnected(
      onReady = { client ->
        val params = QueryPurchasesParams
          .newBuilder()
          .setProductType(BillingClient.ProductType.SUBS)
          .build()

        client.queryPurchasesAsync(params) { billingResult, purchases ->
          if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            promise.resolve(errorMap(billingResult))
            return@queryPurchasesAsync
          }

          val activePurchase = purchases.firstOrNull { purchase ->
            purchase.products.contains(APLUS_PRO_PRODUCT_ID) &&
              purchase.purchaseState == Purchase.PurchaseState.PURCHASED
          }

          if (activePurchase != null) {
            acknowledgeIfNeeded(activePurchase)
            promise.resolve(entitlementMapFromPurchase(activePurchase, true))
          } else {
            promise.resolve(entitlementMap(isAvailable = true, isActive = false))
          }
        }
      },
      onError = { promise.resolve(errorMap(it)) },
    )
  }

  @ReactMethod
  fun launchPurchase(
    productId: String,
    basePlanId: String,
    preferTrialOffer: Boolean,
    obfuscatedAccountId: String?,
    promise: Promise,
  ) {
    if (productId != APLUS_PRO_PRODUCT_ID) {
      promise.resolve(entitlementMap(
        isAvailable = true,
        isActive = false,
        debugMessage = "Unknown productId: $productId",
      ))
      return
    }

    ensureConnected(
      onReady = { client ->
        queryProductDetailsForPurchase(
          client = client,
          basePlanId = basePlanId,
          preferTrialOffer = preferTrialOffer,
          onSuccess = { productDetails, offer ->
            val activity = currentActivity
            if (activity == null) {
              promise.resolve(entitlementMap(
                isAvailable = true,
                isActive = false,
                debugMessage = "No current Android Activity for Billing flow.",
              ))
              return@queryProductDetailsForPurchase
            }

            val productDetailsParams = BillingFlowParams.ProductDetailsParams
              .newBuilder()
              .setProductDetails(productDetails)
              .setOfferToken(offer.offerToken)
              .build()

            val flowBuilder = BillingFlowParams
              .newBuilder()
              .setProductDetailsParamsList(listOf(productDetailsParams))

            if (!obfuscatedAccountId.isNullOrBlank()) {
              flowBuilder.setObfuscatedAccountId(obfuscatedAccountId.take(64))
            }

            val flowParams = flowBuilder.build()

            pendingPurchasePromise = promise
            val billingResult = client.launchBillingFlow(activity, flowParams)
            if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
              pendingPurchasePromise = null
              promise.resolve(errorMap(billingResult))
            }
          },
          onError = { promise.resolve(errorMap(it)) },
        )
      },
      onError = { promise.resolve(errorMap(it)) },
    )
  }

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    val promise = pendingPurchasePromise
    pendingPurchasePromise = null

    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
      val map = errorMap(billingResult)
      promise?.resolve(map)
      sendEvent("aplusBillingPurchaseUpdated", map)
      return
    }

    val activePurchase = purchases?.firstOrNull { purchase ->
      purchase.products.contains(APLUS_PRO_PRODUCT_ID) &&
        purchase.purchaseState == Purchase.PurchaseState.PURCHASED
    }

    val map = if (activePurchase != null) {
      acknowledgeIfNeeded(activePurchase)
      entitlementMapFromPurchase(activePurchase, true)
    } else {
      entitlementMap(isAvailable = true, isActive = false)
    }

    promise?.resolve(map)
    sendEvent("aplusBillingPurchaseUpdated", map)
  }

  private fun queryProductDetailsForPurchase(
    client: BillingClient,
    basePlanId: String,
    preferTrialOffer: Boolean,
    onSuccess: (ProductDetails, ProductDetails.SubscriptionOfferDetails) -> Unit,
    onError: (BillingResult) -> Unit,
  ) {
    queryProductDetails(client) { billingResult, productDetails ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK || productDetails == null) {
        onError(billingResult)
        return@queryProductDetails
      }

      val offers = productDetails.subscriptionOfferDetails.orEmpty()
        .filter { it.basePlanId == basePlanId }

      val selectedOffer = if (preferTrialOffer) {
        offers.firstOrNull { isTrialOffer(it) } ?: offers.firstOrNull()
      } else {
        offers.firstOrNull { !isTrialOffer(it) } ?: offers.firstOrNull()
      }

      if (selectedOffer == null) {
        onError(
          BillingResult
            .newBuilder()
            .setResponseCode(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE)
            .setDebugMessage("No subscription offer for basePlanId=$basePlanId")
            .build(),
        )
        return@queryProductDetails
      }

      onSuccess(productDetails, selectedOffer)
    }
  }

  private fun queryProductsInternal(
    onSuccess: (WritableArray) -> Unit,
    onError: (BillingResult) -> Unit,
  ) {
    ensureConnected(
      onReady = { client ->
        queryProductDetails(client) { billingResult, productDetails ->
          if (billingResult.responseCode != BillingClient.BillingResponseCode.OK || productDetails == null) {
            onError(billingResult)
            return@queryProductDetails
          }

          onSuccess(offersToArray(productDetails))
        }
      },
      onError = onError,
    )
  }

  private fun queryProductDetails(
    client: BillingClient,
    callback: (BillingResult, ProductDetails?) -> Unit,
  ) {
    val product = QueryProductDetailsParams.Product
      .newBuilder()
      .setProductId(APLUS_PRO_PRODUCT_ID)
      .setProductType(BillingClient.ProductType.SUBS)
      .build()

    val params = QueryProductDetailsParams
      .newBuilder()
      .setProductList(listOf(product))
      .build()

    client.queryProductDetailsAsync(params) { billingResult, queryResult ->
      val productDetails = queryResult.productDetailsList.firstOrNull()
      callback(billingResult, productDetails)
    }
  }

  private fun offersToArray(productDetails: ProductDetails): WritableArray {
    val array = Arguments.createArray()
    productDetails.subscriptionOfferDetails.orEmpty().forEach { offer ->
      if (offer.basePlanId == MONTHLY_BASE_PLAN_ID || offer.basePlanId == YEARLY_BASE_PLAN_ID) {
        array.pushMap(offerToMap(productDetails, offer))
      }
    }
    return array
  }

  private fun offerToMap(
    productDetails: ProductDetails,
    offer: ProductDetails.SubscriptionOfferDetails,
  ): WritableMap {
    val paidPhase = offer.pricingPhases.pricingPhaseList.firstOrNull { it.priceAmountMicros > 0 }
      ?: offer.pricingPhases.pricingPhaseList.lastOrNull()
    val trial = isTrialOffer(offer)

    return Arguments.createMap().apply {
      putString("productId", productDetails.productId)
      putString("basePlanId", offer.basePlanId)
      putString("offerId", offer.offerId)
      putString("offerToken", offer.offerToken)
      putString("title", productDetails.title)
      putString("name", productDetails.name)
      putString("formattedPrice", paidPhase?.formattedPrice ?: "")
      putString("billingPeriod", paidPhase?.billingPeriod ?: "")
      putDouble("priceAmountMicros", (paidPhase?.priceAmountMicros ?: 0L).toDouble())
      putString("priceCurrencyCode", paidPhase?.priceCurrencyCode ?: "")
      putBoolean("isTrialOffer", trial)

      val tags = Arguments.createArray()
      offer.offerTags.forEach { tags.pushString(it) }
      putArray("offerTags", tags)
    }
  }

  private fun isTrialOffer(offer: ProductDetails.SubscriptionOfferDetails): Boolean {
    val offerId = offer.offerId?.lowercase().orEmpty()
    val tagged = offer.offerTags.any { it.lowercase().contains("trial") }
    val idMarked = offerId.contains("trial") || offerId.contains("15day") || offerId.contains("15-day")
    val zeroFifteenDay = offer.pricingPhases.pricingPhaseList.any { phase ->
      phase.priceAmountMicros == 0L && phase.billingPeriod == "P15D"
    }
    return tagged || idMarked || zeroFifteenDay
  }

  private fun acknowledgeIfNeeded(purchase: Purchase) {
    if (purchase.isAcknowledged) {
      return
    }

    val client = billingClient ?: return
    val params = AcknowledgePurchaseParams
      .newBuilder()
      .setPurchaseToken(purchase.purchaseToken)
      .build()

    client.acknowledgePurchase(params) { result ->
      if (result.responseCode != BillingClient.BillingResponseCode.OK) {
        Log.w("AplusBilling", "acknowledge failed: ${result.debugMessage}")
      }
    }
  }

  private fun entitlementMapFromPurchase(purchase: Purchase, active: Boolean): WritableMap {
    return entitlementMap(
      isAvailable = true,
      isActive = active,
      productId = APLUS_PRO_PRODUCT_ID,
      purchaseToken = purchase.purchaseToken,
      purchaseState = purchase.purchaseState.toString(),
      isAcknowledged = purchase.isAcknowledged,
    )
  }

  private fun entitlementMap(
    isAvailable: Boolean,
    isActive: Boolean,
    productId: String = APLUS_PRO_PRODUCT_ID,
    purchaseToken: String? = null,
    purchaseState: String? = null,
    isAcknowledged: Boolean? = null,
    debugMessage: String? = null,
  ): WritableMap {
    return Arguments.createMap().apply {
      putBoolean("isAvailable", isAvailable)
      putBoolean("isActive", isActive)
      putString("productId", productId)
      if (purchaseToken != null) {
        putString("purchaseToken", purchaseToken)
      }
      if (purchaseState != null) {
        putString("purchaseState", purchaseState)
      }
      if (isAcknowledged != null) {
        putBoolean("isAcknowledged", isAcknowledged)
      }
      if (debugMessage != null) {
        putString("debugMessage", debugMessage)
      }
    }
  }

  private fun errorMap(result: BillingResult): WritableMap {
    return entitlementMap(
      isAvailable = false,
      isActive = false,
      debugMessage = result.debugMessage,
    ).apply {
      putInt("errorCode", result.responseCode)
    }
  }

  private fun sendEvent(eventName: String, payload: WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  companion object {
    private const val APLUS_PRO_PRODUCT_ID = "aplus_pro"
    private const val MONTHLY_BASE_PLAN_ID = "aplus_pro_monthly"
    private const val YEARLY_BASE_PLAN_ID = "aplus_pro_yearly"
  }
}
