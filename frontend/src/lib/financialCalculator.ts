// Pricing/profitability math for the member Financial Calculator — pure
// functions, no I/O, so the UI component just wires inputs → outputs.
//
// Model: every order placed incurs product cost, dispatching cost, and ad
// spend (Selling Price ÷ ROAS) regardless of outcome. Only a `deliveryRatio`
// fraction of orders actually deliver — those additionally incur delivery
// charges and tax (% of selling price) and generate revenue; the rest
// return, incurring return charges instead of delivery charges (per spec:
// a returned order is charged return charges, never delivery charges).
//
// Expected profit per order = deliveryRatio × price
//   − [productCost + dispatchCost + price/roas
//      + deliveryRatio × (deliveryCharges + tax% × price)
//      + (1 − deliveryRatio) × returnCharges]
//
// Suggested price follows the platform's standard "3x total cost" rule,
// solved algebraically since ad spend and tax are themselves a function of
// price (see suggestedSellingPrice below).

export interface CalculatorInputs {
  productCost: number;
  roas: number;
  deliveryCharges: number;
  taxPercent: number;
  returnCharges: number;
  dispatchCost: number;
  deliveryRatioPercent: number; // 0-100
  manualSellingPrice: number;
}

export type PriceVerdict = "profit" | "loss" | "breakeven";

export interface CalculatorResult {
  /** Costs incurred on every order regardless of price (product, dispatch, weighted delivery/return). */
  fixedCostPerOrder: number;
  /** Fraction of selling price consumed by ad spend + (delivered-weighted) tax. */
  revenueDependentCostFraction: number;
  expectedRevenuePerOrder: number;
  expectedAdCostPerOrder: number;
  expectedTaxPerOrder: number;
  expectedTotalCostPerOrder: number;
  expectedProfitPerOrder: number;
  profitMarginPercent: number | null;
  verdict: PriceVerdict;
  /** Null when the ROAS/tax combination makes a 3x markup mathematically impossible. */
  suggestedSellingPrice: number | null;
  /** Null when no finite price breaks even (ad spend alone outpaces deliverable revenue). */
  breakEvenSellingPrice: number | null;
}

const BREAKEVEN_TOLERANCE_RS = 0.5;

function clampRatio(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100) / 100;
}

export function calculate(inputs: CalculatorInputs): CalculatorResult {
  const productCost = Math.max(0, inputs.productCost || 0);
  const dispatchCost = Math.max(0, inputs.dispatchCost || 0);
  const deliveryCharges = Math.max(0, inputs.deliveryCharges || 0);
  const returnCharges = Math.max(0, inputs.returnCharges || 0);
  const roas = Math.max(0, inputs.roas || 0);
  const taxFraction = Math.max(0, inputs.taxPercent || 0) / 100;
  const deliveryRatio = clampRatio(inputs.deliveryRatioPercent);
  const price = Math.max(0, inputs.manualSellingPrice || 0);

  const fixedCostPerOrder =
    productCost + dispatchCost + deliveryRatio * deliveryCharges + (1 - deliveryRatio) * returnCharges;

  // m: fraction of `price` consumed by ad spend (every order) + tax (delivered orders only).
  const adCostFraction = roas > 0 ? 1 / roas : 0;
  const m = adCostFraction + deliveryRatio * taxFraction;
  // k: net revenue-side coefficient — revenue captured minus ad+tax drag.
  const k = deliveryRatio - m;

  const expectedRevenuePerOrder = deliveryRatio * price;
  const expectedAdCostPerOrder = roas > 0 ? price / roas : 0;
  const expectedTaxPerOrder = deliveryRatio * taxFraction * price;
  const expectedTotalCostPerOrder = fixedCostPerOrder + expectedAdCostPerOrder + expectedTaxPerOrder;
  const expectedProfitPerOrder = expectedRevenuePerOrder - expectedTotalCostPerOrder;

  let verdict: PriceVerdict = "breakeven";
  if (Math.abs(expectedProfitPerOrder) >= BREAKEVEN_TOLERANCE_RS) {
    verdict = expectedProfitPerOrder > 0 ? "profit" : "loss";
  }

  const profitMarginPercent =
    expectedRevenuePerOrder > 0 ? (expectedProfitPerOrder / expectedRevenuePerOrder) * 100 : null;

  const suggestedSellingPrice = 1 - 3 * m > 0 ? (3 * fixedCostPerOrder) / (1 - 3 * m) : null;
  const breakEvenSellingPrice = k > 0 ? fixedCostPerOrder / k : null;

  return {
    fixedCostPerOrder,
    revenueDependentCostFraction: m,
    expectedRevenuePerOrder,
    expectedAdCostPerOrder,
    expectedTaxPerOrder,
    expectedTotalCostPerOrder,
    expectedProfitPerOrder,
    profitMarginPercent,
    verdict,
    suggestedSellingPrice,
    breakEvenSellingPrice,
  };
}
