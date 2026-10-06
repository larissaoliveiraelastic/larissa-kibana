/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Whether or not to instruct the graph component to only render nodes and edges that would be visible in the viewport.
 */
export const ONLY_RENDER_VISIBLE_ELEMENTS = true as const;

/**
 * The size of the grid used for layout and snapping, in pixels.
 */
export const GRID_SIZE = 10;

/**
 * Graph canvas background fill from Figma token `Graph Visualizer/Grid`.
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2
 */
export const GRAPH_BACKGROUND_COLOR = '#F7F8FC';

/** Entity card / preview node corner radius (Figma). */
export const GRAPH_NODE_BORDER_RADIUS = 12;

/** Hover action icon hit-target radius (Figma Action Menu). */
export const GRAPH_ACTION_BUTTON_BORDER_RADIUS = 8;

/** Tooltip corner radius for all graph hover chrome. */
export const GRAPH_TOOLTIP_BORDER_RADIUS = 12;

/**
 * Tooltip label ink — Figma Text/Paragraph in dark color mode (`#CAD3E2`).
 * EUI defaults to `textGhost` (pure white); Graph mocks use the softer paragraph token.
 */
export const GRAPH_TOOLTIP_TEXT_COLOR = '#CAD3E2';

/**
 * Dot pattern color for the graph canvas background.
 * Slightly stronger than the Figma export anti-alias color so dots remain
 * visible at 1–2px on `#F7F8FC`.
 */
export const GRAPH_BACKGROUND_DOT_COLOR = '#C5CCD6';

/**
 * Spacing between background dots, in pixels (matches Figma grid).
 */
export const GRAPH_BACKGROUND_DOT_GAP = 24;

/**
 * Distance from the graph canvas edge to floating chrome (zoom, bottom bar,
 * minimap, actions, Display / Search / Keyboard shortcuts panels).
 * Matches the entity preview / sidebar gutter (16px).
 */
export const GRAPH_PANEL_INSET = 16;

/**
 * Figma Graph viz Component Library — Source Panel / entity card shadow
 * (node 13969:1176): X-small Level 2 — 0 1px 2px rgba(7, 16, 31, 0.06).
 * Default elevation for entity cards, relationship labels, and event labels.
 * Hover uses EUI `euiShadowSmall` (see card / pill nodes).
 */
export const GRAPH_NODE_SHADOW = 'box-shadow: 0 1px 2px 0 rgba(7, 16, 31, 0.06);';

/** Same elevation as {@link GRAPH_NODE_SHADOW}, for SVG shape nodes via CSS `filter`. */
export const GRAPH_NODE_SHADOW_FILTER =
  'filter: drop-shadow(0 1px 2px rgba(7, 16, 31, 0.06));';

/**
 * Radius diameter for background dots, in pixels.
 */
export const GRAPH_BACKGROUND_DOT_SIZE = 2;

/**
 * The vertical padding between nodes when being stacked, in pixels.
 */
export const STACK_NODE_VERTICAL_PADDING = 20;

/**
 * The horizontal padding between nodes when being stacked, in pixels.
 */
export const STACK_NODE_HORIZONTAL_PADDING = 20;

/**
 * graph package scope id - to be used by flyout hook
 */
export const GRAPH_SCOPE_ID = 'graph';

/** Viewport zoom below which nodes render in simplified form (pill-only, icon-only). */
export const GRAPH_SIMPLIFIED_ZOOM_THRESHOLD = 0.75;

/**
 * Furthest zoom-out allowed. Below this, nodes/edges become unreadable.
 * Kept high enough that simplified nodes (~48px icons) stay scannable on screen.
 */
export const GRAPH_MIN_ZOOM = 0.5;

/** Furthest zoom-in allowed. */
export const GRAPH_MAX_ZOOM = 1.3;

/**
 * Max CSS counter-scale applied by zoom-invariant wrappers.
 * Caps enlargement when zooming out so nodes stay readable without overlapping
 * neighbors (must stay ≤ 1 + rank/node separation ÷ node size).
 */
export const GRAPH_ZOOM_INVARIANT_MAX_SCALE = 1.35;

export const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.flyout.networkPreviewPanel';

export const NETWORK_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.bannerTitle`, {
    defaultMessage: 'Preview network details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export {
  NODE_WIDTH,
  NODE_HEIGHT,
  ENTITY_NODE_TOTAL_HEIGHT,
  NODE_LABEL_TOTAL_HEIGHT,
  NODE_LABEL_WIDTH,
  ENTITY_NODE_LABEL_WIDTH,
  NODE_LABEL_HEIGHT,
  NODE_LABEL_DETAILS,
} from './node/styles';
