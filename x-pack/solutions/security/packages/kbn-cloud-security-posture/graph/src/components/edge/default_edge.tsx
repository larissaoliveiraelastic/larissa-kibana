/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '../types';
import { getShapeHandlePosition } from './utils';
import { getMarkerEnd } from './markers';
import { useEdgeColor } from './styles';
import { GRAPH_EDGE_ID } from '../test_ids';
import { getGraphEdgePath, GRAPH_EDGE_STEP_OFFSET } from './get_graph_edge_path';
import { useGraphLayoutContext } from '../graph/graph_layout_context';
import { getGraphEdgeRenderColor } from './edge_processing';
import { ORIGIN_NODE_OUTLINE_OFFSET } from '../node/origin_node_outline';

const dashedStyle = {
  strokeDasharray: '2 2',
};

/** Default edge stroke — 0.5px heavier than React Flow’s 1px default. */
const EDGE_STROKE_WIDTH = 1.5;

const NODES_WITHOUT_MARKER = ['label', 'group', 'relationship'];

export const DefaultEdge = memo(
  ({
    id,
    label,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    data,
  }: EdgeProps) => {
    const { useBundledEdgeRouting } = useGraphLayoutContext();
    const color = getGraphEdgeRenderColor(data);
    const sourceMargin = getShapeHandlePosition(data?.sourceShape);
    const targetMargin = getShapeHandlePosition(data?.targetShape);
    const canHaveArrow =
      !data?.targetShape || !NODES_WITHOUT_MARKER.includes(data?.targetShape);
    // Bundle siblings: only the leader draws tip + final stem into the target.
    const showArrow = canHaveArrow && data?.showArrowHead !== false;
    const markerEnd = showArrow ? getMarkerEnd(color) : undefined;
    // Truncate for entity *and* group fans (groups have no tip, but still need one stem).
    const truncateAtTrunk =
      useBundledEdgeRouting && data?.showArrowHead === false;

    // Stop at the origin ring outer edge when the endpoint has the solid outline.
    const sourceOutlineClearance = data?.sourceHasOriginOutline
      ? ORIGIN_NODE_OUTLINE_OFFSET
      : 0;
    const targetOutlineClearance = data?.targetHasOriginOutline
      ? ORIGIN_NODE_OUTLINE_OFFSET
      : 0;

    // Integer endpoints — sub-pixel handle drift was stacking parallel stems.
    // Same tX for every edge into a tipped target (clearance must not depend on leader).
    // Positive outline clearance moves the tip outward (away from the card interior).
    const sX = Math.round(sourceX - sourceMargin + sourceOutlineClearance);
    const sY = Math.round(sourceY);
    const arrowClearance = canHaveArrow ? 1 : 0;
    const tX = Math.round(
      targetX + targetMargin - arrowClearance - targetOutlineClearance
    );
    const tY = Math.round(targetY);

    const edgePath = getGraphEdgePath({
      sourceX: sX,
      sourceY: sY,
      sourcePosition,
      targetX: tX,
      targetY: tY,
      targetPosition,
      // Bundled mode: shared trunk (offset 0). Unbundled: stagger parallel edges.
      stepOffset: useBundledEdgeRouting ? 0 : GRAPH_EDGE_STEP_OFFSET,
      truncateAtTrunk,
    });

    return (
      <>
        <BaseEdge
          data-test-subj={GRAPH_EDGE_ID}
          id={id}
          path={edgePath}
          interactionWidth={0}
          style={{
            stroke: useEdgeColor(color),
            strokeWidth: EDGE_STROKE_WIDTH,
            ...(data?.type === 'dashed' ? dashedStyle : {}),
          }}
          markerEnd={markerEnd}
        />
      </>
    );
  }
);

DefaultEdge.displayName = 'DefaultEdge';
