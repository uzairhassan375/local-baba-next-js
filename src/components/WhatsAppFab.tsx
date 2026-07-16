import React from "react";

export default function WhatsAppFab() {
  return (
    <a
      href="https://wa.me/923394223327"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 bottom-4 md:bottom-8 md:right-8 z-50 w-[60px] h-[60px] rounded-full flex items-center justify-center bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.16)] transition-transform duration-200 ease-out hover:scale-[1.08] hover:shadow-[0_12px_36px_rgba(37,211,102,0.22)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366]/30"
    >
      {/* Official WhatsApp glyph (white) — no outer circle, no gradients */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path fill="#FFFFFF" d="M20.52 3.48A11.93 11.93 0 0012 0C5.373 0 .001 5.373 0 12c0 2.08.53 4.08 1.53 5.83L0 24l6.46-1.7A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12 0-3.2-1.22-6.2-3.48-8.52zM12 21.5c-1.98 0-3.88-.52-5.52-1.5l-.39-.23-3.84 1.01 1.03-3.73-.25-.39A9.5 9.5 0 0112 2.5c5.24 0 9.5 4.26 9.5 9.5S17.24 21.5 12 21.5z"/>
        <path fill="#25D366" d="M0 0h24v24H0z" opacity="0"/>
        <path fill="#FFFFFF" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.149-.672.15-.198.297-.768.967-.942 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.173.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.148-.672-1.62-.921-2.222-.242-.583-.487-.504-.672-.513l-.573-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479c0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487 3.03 1.333 3.03.888 3.576.833.57-.058 1.758-.718 2.006-1.411.248-.694.248-1.289.173-1.412-.074-.123-.27-.198-.567-.347z"/>
      </svg>
    </a>
  );
}
