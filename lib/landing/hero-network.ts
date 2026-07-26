/** Processos exibidos no grafo de fundo do hero. */
export const HOME_HERO_NETWORK_PROCESSES = [
  "setup",
  "booking",
  "notify",
  "pay",
  "ops",
  "integration",
] as const;

export type HomeHeroNetworkProcess = (typeof HOME_HERO_NETWORK_PROCESSES)[number];

export type HomeHeroNetworkNode = {
  id: string;
  process: HomeHeroNetworkProcess;
  x: number;
  y: number;
  milestone?: boolean;
};

/** Nós em coordenadas normalizadas (0-1) dentro do viewBox. */
export const HOME_HERO_NETWORK_NODES: readonly HomeHeroNetworkNode[] = [
  // Configuração
  { id: "signup", process: "setup", x: 0.41, y: 0.1, milestone: true },
  { id: "services", process: "setup", x: 0.52, y: 0.14 },
  { id: "team", process: "setup", x: 0.63, y: 0.09 },
  { id: "availability", process: "setup", x: 0.74, y: 0.15 },
  { id: "branding", process: "setup", x: 0.84, y: 0.1 },
  { id: "publish", process: "setup", x: 0.94, y: 0.14, milestone: true },
  // Reserva do cliente
  { id: "linkQr", process: "booking", x: 0.39, y: 0.3 },
  { id: "publicPage", process: "booking", x: 0.49, y: 0.36, milestone: true },
  { id: "servicePick", process: "booking", x: 0.59, y: 0.31 },
  { id: "proPick", process: "booking", x: 0.69, y: 0.37 },
  { id: "slotPick", process: "booking", x: 0.79, y: 0.32 },
  { id: "bookingDone", process: "booking", x: 0.9, y: 0.36, milestone: true },
  // WhatsApp / notificações
  { id: "waConfirm", process: "notify", x: 0.45, y: 0.5 },
  { id: "waReminder", process: "notify", x: 0.6, y: 0.53 },
  { id: "waTemplates", process: "notify", x: 0.73, y: 0.49 },
  { id: "attendance", process: "notify", x: 0.87, y: 0.52, milestone: true },
  // Pagamentos
  { id: "pix", process: "pay", x: 0.43, y: 0.66 },
  { id: "mercadoPago", process: "pay", x: 0.55, y: 0.69 },
  { id: "stripe", process: "pay", x: 0.67, y: 0.65 },
  { id: "paymentOk", process: "pay", x: 0.81, y: 0.68, milestone: true },
  // Operação / painel
  { id: "dashboard", process: "ops", x: 0.4, y: 0.84, milestone: true },
  { id: "schedule", process: "ops", x: 0.51, y: 0.88 },
  { id: "clients", process: "ops", x: 0.62, y: 0.83 },
  { id: "analytics", process: "ops", x: 0.73, y: 0.87 },
  { id: "finance", process: "ops", x: 0.84, y: 0.84 },
  { id: "commissions", process: "ops", x: 0.94, y: 0.87 },
  // Integrações (hubs)
  { id: "google", process: "integration", x: 0.36, y: 0.2 },
  { id: "whatsapp", process: "integration", x: 0.57, y: 0.44, milestone: true },
  { id: "pwa", process: "integration", x: 0.96, y: 0.72 },
];

export type HomeHeroNetworkNodeId = (typeof HOME_HERO_NETWORK_NODES)[number]["id"];

/** Cadeias sequenciais por processo. */
export const HOME_HERO_NETWORK_CHAINS: readonly (readonly HomeHeroNetworkNodeId[])[] = [
  ["signup", "services", "team", "availability", "branding", "publish"],
  ["linkQr", "publicPage", "servicePick", "proPick", "slotPick", "bookingDone"],
  ["waConfirm", "waReminder", "waTemplates", "attendance"],
  ["pix", "mercadoPago", "stripe", "paymentOk"],
  ["dashboard", "schedule", "clients", "analytics", "finance", "commissions"],
];

/** Ligações entre processos (malha densa). */
export const HOME_HERO_NETWORK_CROSS_LINKS: readonly [HomeHeroNetworkNodeId, HomeHeroNetworkNodeId][] = [
  ["google", "signup"],
  ["publish", "publicPage"],
  ["publish", "linkQr"],
  ["branding", "publicPage"],
  ["branding", "linkQr"],
  ["services", "servicePick"],
  ["team", "proPick"],
  ["availability", "slotPick"],
  ["linkQr", "publicPage"],
  ["bookingDone", "waConfirm"],
  ["bookingDone", "pix"],
  ["bookingDone", "mercadoPago"],
  ["bookingDone", "stripe"],
  ["bookingDone", "dashboard"],
  ["bookingDone", "pwa"],
  ["whatsapp", "waConfirm"],
  ["whatsapp", "waReminder"],
  ["whatsapp", "waTemplates"],
  ["waConfirm", "schedule"],
  ["attendance", "schedule"],
  ["attendance", "analytics"],
  ["paymentOk", "finance"],
  ["paymentOk", "commissions"],
  ["publicPage", "dashboard"],
  ["team", "schedule"],
  ["services", "analytics"],
  ["availability", "schedule"],
  ["publish", "dashboard"],
  ["stripe", "paymentOk"],
  ["pix", "paymentOk"],
  ["mercadoPago", "paymentOk"],
  ["pwa", "dashboard"],
  ["waTemplates", "bookingDone"],
  ["clients", "waReminder"],
];

export const HOME_HERO_NETWORK_PROCESS_COLORS: Record<HomeHeroNetworkProcess, string> = {
  setup: "#6366f1",
  booking: "#10b981",
  notify: "#22c55e",
  pay: "#d97706",
  ops: "#7c3aed",
  integration: "#64748b",
};

function chainToEdges(chain: readonly HomeHeroNetworkNodeId[]): [HomeHeroNetworkNodeId, HomeHeroNetworkNodeId][] {
  const edges: [HomeHeroNetworkNodeId, HomeHeroNetworkNodeId][] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push([chain[i]!, chain[i + 1]!]);
  }
  return edges;
}

function dedupeEdges(edges: [HomeHeroNetworkNodeId, HomeHeroNetworkNodeId][]): [HomeHeroNetworkNodeId, HomeHeroNetworkNodeId][] {
  const seen = new Set<string>();
  return edges.filter(([a, b]) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const HOME_HERO_NETWORK_EDGES = dedupeEdges([
  ...HOME_HERO_NETWORK_CHAINS.flatMap(chainToEdges),
  ...HOME_HERO_NETWORK_CROSS_LINKS,
]);

export function heroNetworkEdgePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bendSign: 1 | -1 = 1
): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const offset = Math.min(len * 0.22, 64);
  const cx = mx + (-dy / len) * offset * bendSign;
  const cy = my + (dx / len) * offset * bendSign;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

export function heroNetworkProcessCentroids(
  vbW: number,
  vbH: number
): Record<HomeHeroNetworkProcess, { x: number; y: number }> {
  const acc: Record<HomeHeroNetworkProcess, { x: number; y: number; n: number }> = {
    setup: { x: 0, y: 0, n: 0 },
    booking: { x: 0, y: 0, n: 0 },
    notify: { x: 0, y: 0, n: 0 },
    pay: { x: 0, y: 0, n: 0 },
    ops: { x: 0, y: 0, n: 0 },
    integration: { x: 0, y: 0, n: 0 },
  };

  for (const node of HOME_HERO_NETWORK_NODES) {
    if (node.process === "integration") continue;
    const bucket = acc[node.process];
    bucket.x += node.x * vbW;
    bucket.y += node.y * vbH;
    bucket.n += 1;
  }

  return {
    setup: { x: acc.setup.x / acc.setup.n, y: acc.setup.y / acc.setup.n - 36 },
    booking: { x: acc.booking.x / acc.booking.n, y: acc.booking.y / acc.booking.n - 36 },
    notify: { x: acc.notify.x / acc.notify.n, y: acc.notify.y / acc.notify.n - 32 },
    pay: { x: acc.pay.x / acc.pay.n, y: acc.pay.y / acc.pay.n - 32 },
    ops: { x: acc.ops.x / acc.ops.n, y: acc.ops.y / acc.ops.n - 34 },
    integration: { x: 0, y: 0 },
  };
}
