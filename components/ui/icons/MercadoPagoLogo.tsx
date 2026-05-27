/** Logo Mercado Pago (SVG inline — copiar do Catallogo / brand guidelines). */
export function MercadoPagoLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-100 -175 175 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#00BCFF"
        d="M-45.5-120.5c-8.2 0-14.9 6.7-14.9 14.9v90.2c0 8.2 6.7 14.9 14.9 14.9h91c8.2 0 14.9-6.7 14.9-14.9v-90.2c0-8.2-6.7-14.9-14.9-14.9h-91zm76.1 14.9c4.1 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5-7.5-3.4-7.5-7.5 3.4-7.5 7.5-7.5zm-61.2 0c4.1 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5-7.5-3.4-7.5-7.5 3.4-7.5 7.5-7.5z"
      />
      <path
        fill="#fff"
        d="M-30-95h60v50H-30z"
        opacity="0.15"
      />
    </svg>
  );
}
