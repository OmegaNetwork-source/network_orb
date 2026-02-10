import * as THREE from 'three';

/**
 * Shared dApp color palette - 20 vivid, distinguishable colors
 * Used by Hero.js (THREE.Color) and App.js (hex strings)
 */
export const DAPP_PALETTE_HEX = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#FFE66D', // golden yellow
  '#A78BFA', // violet
  '#F97316', // orange
  '#22D3EE', // cyan
  '#FB7185', // pink
  '#34D399', // emerald
  '#FBBF24', // amber
  '#818CF8', // indigo
  '#F472B6', // rose
  '#2DD4BF', // turquoise
  '#E879F9', // fuchsia
  '#38BDF8', // sky blue
  '#A3E635', // lime
  '#FB923C', // tangerine
  '#C084FC', // purple
  '#67E8F9', // light cyan
  '#FCA5A5', // salmon
  '#86EFAC', // mint
];

export const DAPP_PALETTE_THREE = DAPP_PALETTE_HEX.map(hex => new THREE.Color(hex));
