/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEntityNode, isLabelNode } from '../utils';
import type { NodeViewModel } from '../types';

/** CSS class applied to the origin entity when "Highlight starting point" is on. */
export const GRAPH_ORIGIN_NODE_CLASS = 'graph-origin-node';

/** Soft dim for entity hover-actions (siblings fade, graph stays readable). */
export const GRAPH_HOVER_DIM_OPACITY = 0.45;

/**
 * Starting-point highlight target: origin **entity** nodes only.
 * Events/alerts are not ring-highlighted (and the rest of the graph is not dimmed).
 */
export const isOriginEntityNode = (node: NodeViewModel): boolean =>
  isEntityNode(node) && Boolean(node.isOrigin);

/**
 * Origin entities, events, or alerts — used by layout spine / presence checks,
 * not by the Display "Highlight starting point" ring.
 */
export const isOriginEntityOrEventNode = (node: NodeViewModel): boolean => {
  if (isLabelNode(node)) {
    return Boolean(node.isOrigin || node.isOriginAlert);
  }

  return isOriginEntityNode(node);
};
