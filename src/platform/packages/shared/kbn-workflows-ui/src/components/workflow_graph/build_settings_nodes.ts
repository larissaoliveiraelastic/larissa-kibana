/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import { PENDING_NODE_HEIGHT, PENDING_NODE_WIDTH } from './pending_insert';
import type { WorkflowSettingsNodeKind } from './workflow_graph_actions_context';

export const SETTINGS_GROUP_NODE_ID = 'settings:group';

/** Padding around the cards and equal gap between them. */
export const SETTINGS_GROUP_PAD = 16;

/** Title band above the cards (“Workflow settings”). */
export const SETTINGS_GROUP_HEADER_HEIGHT = 20;

/** Option E group title, tall enough for the workflow icon. */
export const DATA_GROUP_HEADER_HEIGHT = 24;

/** Option E preview cards: Info, Constants, and Outputs. */
export const DATA_CARD_WIDTH = 272;
export const DATA_CARD_HEIGHT = 126;

/** Gap from the settings group to the trigger row (tighter than WORKFLOW_RANK_SEP). */
export const SETTINGS_TO_FLOW_GAP = 100;

/** Compact card size for Option B "Compact" layout. */
export const SETTINGS_COMPACT_WIDTH = 168;
export const SETTINGS_COMPACT_HEIGHT = 40;

/** How settings cards are arranged. `description` is Use case B: one card, no group. */
export type SettingsNodesCardLayout = 'row' | 'vertical' | 'compact' | 'single' | 'description';

/** Info card matches a step node width. A canvas gear opens constants and outputs. */
export const DESCRIPTION_CARD_NODE_WIDTH = PENDING_NODE_WIDTH;
export const DESCRIPTION_CARD_NODE_HEIGHT = 100;

export interface WorkflowSettingsNodesInput {
  readonly workflowName: string;
  readonly constantsCount: number;
  readonly outputsCount: number;
  /** Use case B card body. Empty string renders the existing “No description” copy. */
  readonly description?: string;
  /** Use case B card chips. */
  readonly tags?: readonly string[];
  readonly selectedKind?: WorkflowSettingsNodeKind;
  /** Defaults to `row`. */
  readonly cardLayout?: SettingsNodesCardLayout;
  /**
   * Description-card settings gear. `top` keeps it in its own corner block.
   * `zoomCluster` places it in the bottom zoom block, above zoom in.
   * `none` hides it when settings open from somewhere else.
   */
  readonly settingsChromePlacement?: 'top' | 'zoomCluster' | 'none';
  /** Option E titles the group “Workflow data” and uses the preview cards. */
  readonly groupTitle?: 'settings' | 'data';
  /** First constants shown on the Option E card. The count badge uses `constantsCount`. */
  readonly constantsPreview?: readonly { readonly name: string; readonly value: string }[];
  /** First outputs shown on the Option E card. `value` is the output type. */
  readonly outputsPreview?: readonly { readonly name: string; readonly value: string }[];
}

interface SettingsNodeSpec {
  readonly kind: WorkflowSettingsNodeKind;
  readonly label: string;
  readonly subtitle: string;
  readonly iconType: string;
}

function settingsNodeSpecs(input: WorkflowSettingsNodesInput): SettingsNodeSpec[] {
  if (input.cardLayout === 'single') {
    return [
      {
        kind: 'info',
        label: i18n.translate('workflowsUi.graph.settings.singleLabel', {
          defaultMessage: 'Workflow settings',
        }),
        subtitle: i18n.translate('workflowsUi.graph.settings.singleSubtitle', {
          defaultMessage: 'General, constants, and outputs',
        }),
        iconType: 'gear',
      },
    ];
  }

  return [
    {
      kind: 'info',
      label:
        input.workflowName ||
        i18n.translate('workflowsUi.graph.settings.infoFallbackName', {
          defaultMessage: 'Workflow',
        }),
      subtitle: i18n.translate('workflowsUi.graph.settings.infoSubtitle', {
        defaultMessage: 'Workflow info',
      }),
      iconType: 'info',
    },
    {
      kind: 'constants',
      label: i18n.translate('workflowsUi.graph.settings.constantsLabel', {
        defaultMessage: 'Constants',
      }),
      subtitle: i18n.translate('workflowsUi.graph.settings.constantsSubtitle', {
        defaultMessage: '{count} defined',
        values: { count: input.constantsCount },
      }),
      iconType: 'key',
    },
    {
      kind: 'outputs',
      label: i18n.translate('workflowsUi.graph.settings.outputsLabel', {
        defaultMessage: 'Outputs',
      }),
      subtitle: i18n.translate('workflowsUi.graph.settings.outputsSubtitle', {
        defaultMessage: '{count} defined',
        values: { count: input.outputsCount },
      }),
      iconType: 'logstashOutput',
    },
  ];
}

function nodeExtent(nodes: readonly Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = typeof n.width === 'number' ? n.width : PENDING_NODE_WIDTH;
    const h = typeof n.height === 'number' ? n.height : PENDING_NODE_HEIGHT;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Builds React Flow settings nodes (info / constants / outputs) plus a
 * grouping backdrop, placed just above the trigger row.
 */
export function buildWorkflowSettingsNodes(
  layoutNodes: readonly Node[],
  direction: LayoutDirection,
  input: WorkflowSettingsNodesInput
): Node[] {
  if (layoutNodes.length === 0) return [];

  const triggers = layoutNodes.filter((n) => n.type === 'trigger');
  const anchors =
    triggers.length > 0
      ? triggers
      : layoutNodes.filter((n) => n.type === 'step' || n.type === 'trigger');
  const extent = nodeExtent(anchors.length > 0 ? anchors : layoutNodes);
  if (!extent) return [];

  const specs = settingsNodeSpecs(input);
  const cardLayout = input.cardLayout ?? 'row';
  const isCompact = cardLayout === 'compact';
  const arrangeInRow = cardLayout !== 'vertical';
  const width = isCompact ? SETTINGS_COMPACT_WIDTH : PENDING_NODE_WIDTH;
  const height = isCompact ? SETTINGS_COMPACT_HEIGHT : PENDING_NODE_HEIGHT;

  if (cardLayout === 'description') {
    const width = DESCRIPTION_CARD_NODE_WIDTH;
    const height = DESCRIPTION_CARD_NODE_HEIGHT;
    let x: number;
    let y: number;
    if (direction === 'LR') {
      const bandMidY = (extent.minY + extent.maxY) / 2;
      x = extent.minX - SETTINGS_TO_FLOW_GAP - width;
      y = bandMidY - height / 2;
    } else {
      const bandMidX = (extent.minX + extent.maxX) / 2;
      y = extent.minY - SETTINGS_TO_FLOW_GAP - height;
      x = bandMidX - width / 2;
    }
    return [
      {
        id: 'settings:description',
        type: 'settingsCard',
        position: { x, y },
        width,
        height,
        draggable: false,
        selectable: false,
        connectable: false,
        className: 'nopan',
        selected: input.selectedKind === 'info',
        data: {
          kind: 'info',
          workflowName: input.workflowName,
          description: input.description ?? '',
          tags: input.tags ?? [],
        },
      },
    ];
  }

  if (cardLayout === 'single') {
    const spec = specs[0];
    let x: number;
    let y: number;
    if (direction === 'LR') {
      const bandMidY = (extent.minY + extent.maxY) / 2;
      x = extent.minX - SETTINGS_TO_FLOW_GAP - width;
      y = bandMidY - height / 2;
    } else {
      const bandMidX = (extent.minX + extent.maxX) / 2;
      y = extent.minY - SETTINGS_TO_FLOW_GAP - height;
      x = bandMidX - width / 2;
    }
    return [
      {
        id: `settings:${spec.kind}`,
        type: 'settings',
        position: { x, y },
        width,
        height,
        draggable: false,
        connectable: false,
        className: 'nopan',
        selected: input.selectedKind === spec.kind,
        data: {
          kind: spec.kind,
          label: spec.label,
          subtitle: spec.subtitle,
          iconType: spec.iconType,
          compact: false,
        },
      },
    ];
  }

  const isDataGroup = input.groupTitle === 'data';
  const cardWidth = isDataGroup ? DATA_CARD_WIDTH : width;
  const cardHeight = isDataGroup ? DATA_CARD_HEIGHT : height;
  const gap = SETTINGS_GROUP_PAD;
  const pad = SETTINGS_GROUP_PAD;
  const headerHeight = isDataGroup ? DATA_GROUP_HEADER_HEIGHT : SETTINGS_GROUP_HEADER_HEIGHT;
  const span =
    specs.length * (arrangeInRow ? cardWidth : cardHeight) + (specs.length - 1) * gap;
  // Top pad + title + gap before cards (same as pad).
  const topInset = pad + headerHeight + pad;
  const cardAreaW = arrangeInRow ? span : cardWidth;
  const cardAreaH = arrangeInRow ? cardHeight : span;
  const groupW = cardAreaW + pad * 2;
  const groupH = topInset + cardAreaH + pad;

  let groupX: number;
  let groupY: number;
  if (direction === 'LR') {
    const bandMidY = (extent.minY + extent.maxY) / 2;
    groupX = extent.minX - SETTINGS_TO_FLOW_GAP - cardAreaW - pad;
    groupY = bandMidY - groupH / 2;
  } else {
    const bandMidX = (extent.minX + extent.maxX) / 2;
    groupY = extent.minY - SETTINGS_TO_FLOW_GAP - cardAreaH - pad;
    // Keep the taller header band above the previous card-only top edge.
    groupY -= topInset - pad;
    groupX = bandMidX - cardAreaW / 2 - pad;
  }

  const groupNode: Node = {
    id: SETTINGS_GROUP_NODE_ID,
    type: 'settingsGroup',
    position: { x: groupX, y: groupY },
    width: groupW,
    height: groupH,
    draggable: false,
    selectable: false,
    connectable: false,
    // Keep the backdrop under the cards.
    zIndex: -1,
    data: {
      hasSelection: input.selectedKind != null,
      title: input.groupTitle === 'data' ? 'data' : 'settings',
    },
  };

  const cardNodes = specs.map((spec, index) => {
    const localX = arrangeInRow ? pad + index * (cardWidth + gap) : pad;
    const localY = arrangeInRow ? topInset : topInset + index * (cardHeight + gap);
    const preview =
      spec.kind === 'constants'
        ? input.constantsPreview
        : spec.kind === 'outputs'
          ? input.outputsPreview
          : undefined;

    return {
      id: `settings:${spec.kind}`,
      type: 'settings',
      parentId: SETTINGS_GROUP_NODE_ID,
      extent: 'parent' as const,
      position: { x: localX, y: localY },
      width: cardWidth,
      height: cardHeight,
      draggable: false,
      connectable: false,
      className: 'nopan',
      selected: input.selectedKind === spec.kind,
      data: {
        kind: spec.kind,
        label: spec.label,
        subtitle: spec.subtitle,
          iconType: spec.iconType,
          compact: isCompact,
          presentation: isDataGroup ? 'data' : 'summary',
          workflowName: input.workflowName,
          description: input.description ?? '',
          tags: input.tags ?? [],
          count: spec.kind === 'constants' ? input.constantsCount : input.outputsCount,
          rows: preview ?? [],
        },
    };
  });

  return [groupNode, ...cardNodes];
}
