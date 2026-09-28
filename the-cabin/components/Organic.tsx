"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Hand-drawn, living edges for buttons. Two SVG noise filters displace thin
 * outlines so they wobble like ink on wet paper; each button stacks a fill
 * and two offset strokes so the edge reads as a soft, double-drawn line.
 */
export function OrganicDefs() {
  return (
    <svg className="organic-defs" aria-hidden width="0" height="0">
      <filter id="wobble-a" x="-30%" y="-120%" width="160%" height="340%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="4" result="noise">
          <animate attributeName="baseFrequency" dur="11s" values="0.012 0.04;0.017 0.05;0.012 0.04" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="wobble-b" x="-30%" y="-120%" width="160%" height="340%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="11" result="noise">
          <animate attributeName="baseFrequency" dur="15s" values="0.02 0.03;0.014 0.045;0.02 0.03" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="G" yChannelSelector="B" />
      </filter>
      <filter id="wobble-soft" x="-30%" y="-120%" width="160%" height="340%">
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.03" numOctaves="1" seed="2" result="noise">
          <animate attributeName="baseFrequency" dur="9s" values="0.01 0.03;0.014 0.038;0.01 0.03" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

type Variant = "primary" | "glass" | "outline";

interface BlobProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
  size?: "md" | "sm";
  children: ReactNode;
}

export function Blob({ variant = "glass", active = false, size = "md", className = "", children, ...rest }: BlobProps) {
  return (
    <button className={`blob blob-${variant} blob-${size} ${className}`} data-active={active} {...rest}>
      <span className="blob-fill" aria-hidden />
      <span className="blob-edge edge-a" aria-hidden />
      <span className="blob-edge edge-b" aria-hidden />
      <span className="blob-label">{children}</span>
    </button>
  );
}

export function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 20 12" aria-hidden>
      <path d="M1 6 H18 M13 1 L18 6 L13 11" />
    </svg>
  );
}
