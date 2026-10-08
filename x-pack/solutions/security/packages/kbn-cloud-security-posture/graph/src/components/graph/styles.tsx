/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Global, css } from '@emotion/react';
import { GRAPH_HOVER_DIM_OPACITY } from './graph_origin_utils';
import { GRAPH_SEARCH_NON_MATCH_NODE_OPACITY } from './graph_search_utils';
import { GRAPH_TOOLTIP_BORDER_RADIUS, GRAPH_TOOLTIP_TEXT_COLOR } from '../constants';

export const GlobalGraphStyles = () => {
  return (
    <Global
      styles={css`
        .react-flow {
          /* Keep the dotted Background (z-index: -1) above ancestor fills. */
          isolation: isolate;
        }

        .react-flow__node:focus:focus-visible {
          outline: none !important;
        }

        .react-flow__edge-path {
          vector-effect: non-scaling-stroke;
        }

        .react-flow__pane {
          cursor: grab;
        }

        .react-flow__pane:active {
          cursor: grabbing;
        }

        .react-flow__node:not(.non-interactive) {
          cursor: pointer;
          overflow: visible;
        }

        .react-flow__node:not(.non-interactive).dragging {
          cursor: grabbing;
        }

        .react-flow__nodesselection {
          display: none;
        }

        /* Highlight starting point: ring on origin only — no graph-wide opacity. */

        .react-flow.graph-in-page-search-active
          .react-flow__node:not(.graph-search-match):not(:hover):not(.selected) {
          transition: opacity 0.2s ease;
          opacity: ${GRAPH_SEARCH_NON_MATCH_NODE_OPACITY};
        }

        .react-flow.graph-entity-filters-active
          .react-flow__node:not(.graph-entity-filter-match):not(:hover):not(.selected) {
          transition: opacity 0.2s ease;
          opacity: ${GRAPH_SEARCH_NON_MATCH_NODE_OPACITY};
        }

        .react-flow__node.graph-search-active-match {
          outline: 2px dashed var(--euiColorDarkShade, #343741);
          outline-offset: 2px;
        }

        /* Test B / hover actions: dim siblings only while an entity is hovered */
        .react-flow.graph-entity-actions-hover .react-flow__node:not(.graph-actions-hover-active) {
          transition: opacity 0.15s ease;
          opacity: ${GRAPH_HOVER_DIM_OPACITY};
        }

        .react-flow.graph-entity-actions-hover .react-flow__edge {
          transition: opacity 0.15s ease;
          opacity: ${GRAPH_HOVER_DIM_OPACITY};
        }

        /* Graph tooltips — Figma 12px radius + Text/Paragraph (dark), not Ghost white. */
        .euiToolTip {
          border-radius: ${GRAPH_TOOLTIP_BORDER_RADIUS}px !important;
          color: ${GRAPH_TOOLTIP_TEXT_COLOR} !important;
        }
      `}
    />
  );
};
