"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculate, CalculatorInputs } from "@/lib/financialCalculator";

const emptyInputs: CalculatorInputs = {
  productCost: 0,
  roas: 0,
  deliveryCharges: 0,
  taxPercent: 0,
  returnCharges: 0,
  dispatchCost: 0,
  deliveryRatioPercent: 100,
  manualSellingPrice: 0,
};

function numberField(v: number): string {
  return v === 0 ? "" : String(v);
}

export default function MemberFinancialCalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(emptyInputs);

  const set = (field: keyof CalculatorInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? 0 : Number(e.target.value);
    setInputs(prev => ({ ...prev, [field]: Number.isFinite(value) ? value : 0 }));
  };

  const result = useMemo(() => calculate(inputs), [inputs]);

  const verdictStyles = {
    profit: { label: "Profit", cls: "bg-success/10 text-success border-success/20", Icon: TrendingUp },
    loss: { label: "Loss", cls: "bg-danger/10 text-danger border-danger/20", Icon: TrendingDown },
    breakeven: { label: "Break-even", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", Icon: Minus },
  } as const;
  const verdict = verdictStyles[result.verdict];

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="p-2 rounded-xl bg-primary/10 text-primary">
            <Calculator size={22} />
          </span>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">Financial Calculator</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 ml-1">
            FREE
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Check whether your selling price makes a profit, and get a suggested price based on the standard 3x cost rule.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4 text-xs bg-card border border-border rounded-card p-5">
          <span className="font-bold uppercase tracking-wider text-muted-foreground">Your Costs</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Product Cost (Rs)</Label>
              <Input type="number" min={0} value={numberField(inputs.productCost)} onChange={set("productCost")} placeholder="0" className="h-9 bg-background" />
            </div>
            <div>
              <Label className="mb-1 block">ROAS</Label>
              <Input type="number" min={0} step="0.1" value={numberField(inputs.roas)} onChange={set("roas")} placeholder="e.g. 3" className="h-9 bg-background" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Delivery Charges (Rs)</Label>
              <Input type="number" min={0} value={numberField(inputs.deliveryCharges)} onChange={set("deliveryCharges")} placeholder="0" className="h-9 bg-background" />
            </div>
            <div>
              <Label className="mb-1 block">Tax (%)</Label>
              <Input type="number" min={0} value={numberField(inputs.taxPercent)} onChange={set("taxPercent")} placeholder="0" className="h-9 bg-background" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Return Charges (Rs)</Label>
              <Input type="number" min={0} value={numberField(inputs.returnCharges)} onChange={set("returnCharges")} placeholder="0" className="h-9 bg-background" />
              <p className="text-[10px] text-muted-foreground mt-1">Applied only on returned orders, instead of delivery charges.</p>
            </div>
            <div>
              <Label className="mb-1 block">Dispatching Cost (Rs)</Label>
              <Input type="number" min={0} value={numberField(inputs.dispatchCost)} onChange={set("dispatchCost")} placeholder="0" className="h-9 bg-background" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Delivery Ratio (%)</Label>
            <Input type="number" min={0} max={100} value={numberField(inputs.deliveryRatioPercent)} onChange={set("deliveryRatioPercent")} placeholder="e.g. 70" className="h-9 bg-background" />
            <p className="text-[10px] text-muted-foreground mt-1">% of orders that get delivered successfully — the rest are treated as returned.</p>
          </div>

          <div className="pt-2 border-t border-border">
            <Label className="mb-1 block font-bold">Manual Selling Price (Rs)</Label>
            <Input type="number" min={0} value={numberField(inputs.manualSellingPrice)} onChange={set("manualSellingPrice")} placeholder="Price you're planning to sell at" className="h-10 bg-background font-semibold" />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Verdict */}
          <div className={`rounded-card border p-5 ${verdict.cls}`}>
            <div className="flex items-center gap-2">
              <verdict.Icon size={20} />
              <span className="font-heading font-bold text-lg">{verdict.label}</span>
            </div>
            <p className="text-sm mt-2">
              At Rs {inputs.manualSellingPrice.toLocaleString()}, you&apos;re expected to{" "}
              {result.verdict === "loss" ? "lose" : result.verdict === "profit" ? "make a profit of" : "roughly break even at"}{" "}
              <span className="font-bold">Rs {Math.abs(result.expectedProfitPerOrder).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> per order
              {result.profitMarginPercent != null && (
                <> ({result.profitMarginPercent.toFixed(1)}% margin)</>
              )}
              .
            </p>
          </div>

          {/* Suggested price */}
          <div className="bg-card border border-border rounded-card p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggested Selling Price</span>
            {result.suggestedSellingPrice != null ? (
              <>
                <p className="font-heading font-bold text-3xl text-primary mt-1">
                  Rs {Math.round(result.suggestedSellingPrice).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on the standard 3x markup rule, accounting for your ROAS, tax, delivery ratio and return costs.
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2 mt-2 text-xs text-danger">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                  A 3x markup isn&apos;t mathematically possible with this ROAS/Tax combination — ad spend and tax alone would
                  consume too much of the revenue. Improve your ROAS or reduce tax burden to get a suggested price.
                </p>
              </div>
            )}
          </div>

          {/* Break-even */}
          <div className="bg-card border border-border rounded-card p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Break-even Price</span>
            {result.breakEvenSellingPrice != null ? (
              <p className="font-heading font-bold text-xl text-foreground mt-1">
                Rs {Math.round(result.breakEvenSellingPrice).toLocaleString()}
              </p>
            ) : (
              <div className="flex items-start gap-2 mt-2 text-xs text-danger">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>No price breaks even — ad spend alone exceeds what your delivery ratio can capture in revenue.</p>
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="bg-card border border-border rounded-card p-5 text-xs space-y-1.5">
            <span className="font-bold uppercase tracking-wider text-muted-foreground block mb-2">Per-order breakdown (at your price)</span>
            <div className="flex justify-between"><span className="text-muted-foreground">Expected revenue</span><span className="font-semibold">Rs {result.expectedRevenuePerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ad spend (ROAS)</span><span className="font-semibold">Rs {result.expectedAdCostPerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-semibold">Rs {result.expectedTaxPerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Product + dispatch + delivery/return (blended)</span><span className="font-semibold">Rs {result.fixedCostPerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5"><span className="font-bold">Total expected cost</span><span className="font-bold">Rs {result.expectedTotalCostPerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Max ad spend (before loss)</span>
              <span className="font-semibold">{result.maxAdSpendPerOrder != null ? `Rs ${result.maxAdSpendPerOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Break-even ROAS</span><span className="font-semibold">{result.breakEvenRoas != null ? `${result.breakEvenRoas.toFixed(2)}x` : "—"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
