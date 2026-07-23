"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const WHATSAPP_URL   = "https://chat.whatsapp.com/FT2GIUaopaMJ8ZMeZI0lLE?s=sh&p=i&ilr=0&amv=2";
const TIKTOK_URL     = "https://www.tiktok.com/@thelocalbaba?_r=1&_t=ZS-986nctIcLAu";
const INSTAGRAM_URL  = "https://www.instagram.com/localbaba0?igsh=MXVoMTQ1am01OW9zeQ%3D%3D&utm_source=qr";
const FACEBOOK_URL   = "https://www.facebook.com/share/1D3mYsssTj/?mibextid=wwXIfr";

const STORAGE_KEY = "localbaba_whatsapp_community_modal_timestamp";
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown

export default function WhatsAppCommunityModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Never show on admin pages
    if (pathname && pathname.startsWith("/admin")) {
      return;
    }

    try {
      const lastShownStr = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (lastShownStr) {
        const lastShown = Number(lastShownStr);
        if (now - lastShown < COOLDOWN_MS) {
          // Cooldown active (< 15 minutes) - do not show modal
          return;
        }
      }

      // 15+ mins elapsed or first time -> open modal and set timestamp
      const timer = window.setTimeout(() => {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, now.toString());
      }, 500);

      return () => window.clearTimeout(timer);
    } catch (e) {
      console.error("Failed to check modal cooldown", e);
    }
  }, [pathname]);

  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(92vw,22rem)] max-w-xs rounded-2xl border border-orange-300 bg-white p-0 shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden gap-0">
        <DialogTitle className="sr-only">Join our WhatsApp community</DialogTitle>
        <DialogDescription className="sr-only">
          Get product updates and alerts by joining our WhatsApp community.
        </DialogDescription>

        <div className="px-7 pb-2 pt-2 text-center">

          {/* Top label */}
          <p className="text-xs font-semibold text-[#ff7a00]">Our Efforts</p>

          {/* Headline */}
          <h3 className="mt-0.5 text-base font-bold text-slate-900 leading-tight">
            your advantage
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">Get product updates &amp; alerts</p>

          {/* Logo */}
          <div className="mt-2 flex items-center justify-center">
            <img
              src="/Localbaba-logo.png"
              alt="LocalBaba"
              className="h-28 w-auto object-contain"
            />
          </div>

          {/* Sub text */}
          <p className="mt-1 text-xs text-slate-600">Join our</p>
          <p className="text-sm font-bold text-slate-900">Exclusive WhatsApp Channel!</p>

          {/* Join Now button */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full rounded-xl bg-[#ff7a00] py-2 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-[#e86e00] hover:-translate-y-[1px] hover:shadow-lg"
          >
            Join Now!
          </a>

          {/* Social icons */}
          <p className="mt-2 text-[10px] text-slate-400 tracking-wide">Join us for more</p>
          <div className="mt-1.5 flex items-center justify-center gap-5">

            {/* TikTok */}
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              className="transition-transform duration-200 hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-slate-800" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.05a8.17 8.17 0 0 0 4.77 1.53V7.14a4.84 4.84 0 0 1-1.01-.45z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="transition-transform duration-200 hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ig-pop" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433"/>
                    <stop offset="25%" stopColor="#e6683c"/>
                    <stop offset="50%" stopColor="#dc2743"/>
                    <stop offset="75%" stopColor="#cc2366"/>
                    <stop offset="100%" stopColor="#bc1888"/>
                  </linearGradient>
                </defs>
                <path fill="url(#ig-pop)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="transition-transform duration-200 hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#1877F2]" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </a>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
