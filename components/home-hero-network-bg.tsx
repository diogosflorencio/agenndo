"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  HOME_HERO_NETWORK_EDGES,
  HOME_HERO_NETWORK_NODES,
  heroNetworkEdgePath,
  type HomeHeroNetworkNode,
  type HomeHeroNetworkNodeId,
} from "@/lib/landing/hero-network";

const VB_W = 1560;
const VB_H = 920;

function NetworkNode({
  node,
  x,
  y,
  label,
}: {
  node: HomeHeroNetworkNode;
  x: number;
  y: number;
  label: string;
}) {
  const dotR = node.milestone ? 5 : 3.8;
  const haloR = node.milestone ? 14 : 10;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={haloR} className="hero-network-node-halo" fill="#10b981" />
      <circle r={dotR} className="hero-network-node-dot" fill="#10b981" />
      <text
        y={dotR + 11}
        textAnchor="middle"
        className="hero-network-node-caption"
        style={{ fontSize: node.milestone ? 8 : 7.5 }}
      >
        {label}
      </text>
    </g>
  );
}

/** Grafo denso no fundo do hero: bolinhas verdes + rotulos pequenos embaixo. */
export function HomeHeroNetworkBackground() {
  const { t } = useI18n();

  const nodeMap = useMemo(() => {
    const map = new Map<HomeHeroNetworkNodeId, HomeHeroNetworkNode & { px: number; py: number }>();
    for (const node of HOME_HERO_NETWORK_NODES) {
      map.set(node.id, { ...node, px: node.x * VB_W, py: node.y * VB_H });
    }
    return map;
  }, []);

  const edges = useMemo(
    () =>
      HOME_HERO_NETWORK_EDGES.map(([fromId, toId], index) => {
        const from = nodeMap.get(fromId)!;
        const to = nodeMap.get(toId)!;
        const bendSign = index % 2 === 0 ? 1 : (-1 as const);
        return {
          id: `${fromId}-${toId}`,
          path: heroNetworkEdgePath(from.px, from.py, to.px, to.py, bendSign),
          delay: (index * 0.11) % 2.8,
          duration: 1.8 + (index % 7) * 0.28,
          reverse: index % 4 === 0,
          emphasis: index % 5 === 0,
        };
      }),
    [nodeMap]
  );

  return (
    <div
      className="pointer-events-none absolute -top-6 sm:-top-10 left-0 right-0 bottom-0 min-h-[620px] md:min-h-[760px] lg:min-h-[820px] overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <pattern id="hero-network-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" className="hero-network-grid-dot" />
          </pattern>
          <linearGradient id="hero-network-fade-x" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="black" />
            <stop offset="28%" stopColor="black" />
            <stop offset="48%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
          <mask id="hero-network-mask">
            <rect width={VB_W} height={VB_H} fill="url(#hero-network-fade-x)" />
          </mask>
        </defs>

        <rect width={VB_W} height={VB_H} fill="url(#hero-network-grid)" opacity="0.55" mask="url(#hero-network-mask)" />

        <g mask="url(#hero-network-mask)">
          {edges.map((edge) => (
            <g key={edge.id}>
              <path d={edge.path} className="hero-network-edge-base" />
              <path
                d={edge.path}
                className={edge.reverse ? "hero-network-edge-flow-reverse" : "hero-network-edge-flow"}
                style={{
                  animationDelay: `${edge.delay}s`,
                  animationDuration: `${edge.duration}s`,
                  opacity: edge.emphasis ? 0.9 : 0.72,
                }}
              />
              <path
                d={edge.path}
                className="hero-network-edge-flow hero-network-edge-flow-secondary"
                style={{
                  animationDelay: `${edge.delay + 0.65}s`,
                  animationDuration: `${edge.duration + 0.45}s`,
                }}
              />
              {edge.emphasis ? (
                <path
                  d={edge.path}
                  className="hero-network-edge-flow hero-network-edge-flow-tertiary"
                  style={{
                    animationDelay: `${edge.delay + 1.3}s`,
                    animationDuration: `${edge.duration + 0.9}s`,
                  }}
                />
              ) : null}
            </g>
          ))}

          {HOME_HERO_NETWORK_NODES.map((node) => {
            const pos = nodeMap.get(node.id)!;
            const label = t(`landing.heroNetwork.nodes.${node.id}`);
            return (
              <NetworkNode key={node.id} node={node} x={pos.px} y={pos.py} label={label} />
            );
          })}
        </g>
      </svg>

      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/78 to-white/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-transparent to-white/75" />
    </div>
  );
}
