/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';

/**
 * Dim siblings while a graph node is hovered — same treatment for entities and connectors.
 * Toggles `graph-entity-actions-hover` on the flow and `graph-actions-hover-active` on the node.
 */
export const useGraphNodeHoverFocus = () => {
  const containerRef = useRef<HTMLElement | null>(null);

  const setNodeHoverFocus = useCallback((active: boolean) => {
    const container = containerRef.current;
    const nodeEl = container?.closest('.react-flow__node');
    const flowEl = container?.closest('.react-flow');
    if (!nodeEl || !flowEl) {
      return;
    }

    if (active) {
      flowEl.classList.add('graph-entity-actions-hover');
      nodeEl.classList.add('graph-actions-hover-active');
      return;
    }

    nodeEl.classList.remove('graph-actions-hover-active');
    if (!flowEl.querySelector('.graph-actions-hover-active')) {
      flowEl.classList.remove('graph-entity-actions-hover');
    }
  }, []);

  return { containerRef, setNodeHoverFocus };
};
