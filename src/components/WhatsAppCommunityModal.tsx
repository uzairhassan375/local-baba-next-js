"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

const WHATSAPP_URL = "https://chat.whatsapp.com/FT2GIUaopaMJ8ZMeZI0lLE?s=sh&p=i&ilr=0&amv=2";

export default function WhatsAppCommunityModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 200);

    return () => window.clearTimeout(timer);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(92vw,22rem)] max-w-xs rounded-[1.25rem] border-2 border-orange-300 bg-white p-3 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
        <DialogTitle className="sr-only">Join our WhatsApp community</DialogTitle>
        <div className="relative">
          <div className="text-center">
            <p className="text-sm text-[#ff7a00] font-medium">Our Efforts</p>
            <h3 className="text-base font-semibold text-slate-900">your advantage</h3>
            <p className="mt-1 text-sm text-slate-600">Get product updates &amp; alerts</p>
          </div>

          <div className="-mt-1 flex items-center justify-center">
            <img src="/Localbaba-logo.png" alt="LocalBaba" className="h-32 w-auto object-contain" />
          </div>

          <div className="-mt-1 text-center">
            <p className="text-sm font-semibold text-slate-800">Join our</p>
            <p className="text-sm font-semibold text-slate-800">whatsapp community</p>
          </div>

          <div className="mt-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-xl bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,122,0,0.18)] transition hover:bg-[#ff8f2f]"
            >
              Join Now!
            </a>
          </div>

          {/* 'Maybe later' button removed per request */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
