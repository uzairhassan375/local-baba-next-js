import { X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQty, total } = useCart();
  const hasMoqIssue = items.some(i => i.qty < i.moq);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 z-50" onClick={closeCart} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card z-50 shadow-xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading font-bold text-lg">Your cart ({items.length} items)</h2>
          <button onClick={closeCart} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Your cart is empty</p>}
          {items.map(item => (
            <div key={item.productId} className="flex gap-3 p-3 border border-border rounded-card">
              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQty(item.productId, item.qty - 10)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs">−</button>
                  <span className="font-mono text-xs">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 10)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs">+</button>
                </div>
                <p className="text-sm font-heading font-bold text-primary mt-1">Rs {(item.pricePerPc * item.qty).toLocaleString()}</p>
              </div>
              <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-danger text-xs self-start">×</button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            {hasMoqIssue && (
              <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
                Some items below MOQ of 30 pcs
              </div>
            )}
            <div className="flex justify-between font-heading font-bold text-lg">
              <span>Subtotal</span>
              <span>Rs {total.toLocaleString()}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full h-12 rounded-lg bg-primary text-primary-foreground text-center leading-[48px] font-heading font-semibold hover:bg-accent-hover transition-colors"
            >
              Proceed to checkout
            </Link>
            <button onClick={closeCart} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
