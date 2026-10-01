/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  type GraphGroupedNodePreviewPanelProps,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import {
  type EntityDocumentDataModel,
  type NodeDocumentDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import {
  DOCUMENT_TYPE_ENTITY,
  PROJECT_ROUTING_ALL,
  PROJECT_ROUTING_ORIGIN,
  type ProjectRouting,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { isEntityNodeEnriched } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { useFlyoutBodyAvailableHeight } from '../hooks/use_flyout_body_available_height';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { PREFIX } from '../../../../../flyout/shared/test_ids';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../../../common/utils/normalize_time_range';
import { useKibana, useToasts } from '../../../../../common/lib/kibana';
import { extractTimelineCapabilities } from '../../../../../common/utils/timeline_capabilities';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;
export const GRAPH_ID = 'graph-visualization' as const;

const MAX_DOCUMENTS_TO_LOAD = 50;

/** Map graph entity type / tag → typed flyout engine (host | user | service). */
const resolveEntityEngineType = (
  node: NodeViewModel,
  entity?: { engine_type?: string; type?: string }
): string | undefined => {
  const candidates = [entity?.engine_type, entity?.type, 'tag' in node ? node.tag : undefined];
  for (const raw of candidates) {
    if (!raw) continue;
    const normalized = String(raw).toLowerCase();
    if (normalized === 'host' || normalized === 'user' || normalized === 'service') {
      return normalized;
    }
  }
  return undefined;
};

const resolveEntityDisplayName = (
  node: NodeViewModel,
  entity?: { name?: string },
  fallbackId?: string
): string | undefined => {
  if (entity?.name) return entity.name;
  if ('label' in node && typeof node.label === 'string' && node.label.length > 0) {
    return node.label;
  }
  return fallbackId;
};

/**
 * Node-click callbacks. This component interprets the clicked node and routes it to the
 * appropriate callback; the consumer owns how each preview is opened (the flyout v2 system flyout,
 * or the legacy expandable flyout). This component does not open any flyout itself.
 */
interface GraphNodeCallbacks {
  /**
   * Open a single document (event or alert) preview. The optional `isEvent` lets banner-aware
   * consumers pick the banner; consumers that don't need it (e.g. the flyout v2 system flyout,
   * which opens the full document view) simply omit the parameter.
   */
  onShowDocument: (id: string, indexName?: string, isEvent?: boolean) => void;
  /** Open an entity (host/user/service/generic) preview. */
  onShowEntity: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
    /** React Flow node id — used to keep the card selected while details are open. */
    graphNodeId?: string;
  }) => void;
  /** Open a grouped-entities or grouped-events preview. */
  onShowGrouped: (
    params: Omit<
      GraphGroupedNodePreviewPanelProps,
      'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
    > & {
      /** React Flow node id for the group card selection state. */
      graphNodeId?: string;
      /** Side-panel header title, e.g. "3 GCP Compute Instances". */
      groupTitle?: string;
    }
  ) => void;
  /**
   * Open a network (IP) preview.
   * Note: `GraphInvestigation` does not expose flow direction — callers always receive the source IP.
   */
  onShowNetwork: (ip: string) => void;
}

/** Props for event/alert mode — drives the graph from an alert/event document */
interface EventGraphVisualizationProps extends GraphNodeCallbacks {
  mode: 'event';
  /** Scope ID for the flyout panel */
  scopeId: string;
  /** Event/alert document IDs that are the origin of the graph */
  eventIds: string[];
  /** Timestamp of the source event/alert */
  timestamp: string;
  /** Whether the source document is an alert */
  isAlert: boolean;
}

/** Props for entity mode — drives the graph from an Entity Store entity ID */
interface EntityGraphVisualizationProps extends GraphNodeCallbacks {
  mode: 'entity';
  /** Scope ID for the flyout panel */
  scopeId: string;
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
  /** Display name (host/user/service) — matches graph node label when id ≠ name */
  entityName?: string;
  /**
   * Flyout Entity risk (`calculated_score_norm`) for the origin node.
   * Keeps expanded graph aligned with table + preview.
   */
  originRiskScore?: number | null;
}

export type GraphVisualizationProps = (EventGraphVisualizationProps | EntityGraphVisualizationProps) & {
  /** Node ids kept selected while the entity details side panel is open. */
  selectedNodeIds?: string[];
  /** Clear details selection (pane click / close). */
  onClearDetailsSelection?: () => void;
};

/**
 * Full-screen graph investigation view for use in left-panel flyout tabs.
 * Supports two modes:
 * - 'event': driven by alert/event document IDs and timestamp (used in document details).
 * - 'entity': driven by an Entity Store entity ID (used in entity detail panels).
 */
export const GraphVisualization: React.FC<GraphVisualizationProps> = memo((props) => {
  const {
    scopeId,
    onShowDocument,
    onShowEntity,
    onShowGrouped,
    onShowNetwork,
    selectedNodeIds,
    onClearDetailsSelection,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(wrapperRef);

  const {
    application: { capabilities },
    cps,
  } = useKibana().services;
  const { read: hasTimelineAccess } = extractTimelineCapabilities(capabilities);

  // CPS project routing for cross-project events. Security pages do not host a CPS
  // picker — routing is locked to the active space NPRE (see kfirpeled comment on
  // security-team#16998). Read the space's default routing rather than the picker
  // observable (which is gated by per-app `ProjectRoutingAccess` and returns
  // undefined when no app has registered the route as READONLY/EDITABLE).
  const [projectRouting, setProjectRouting] = useState<ProjectRouting | undefined>(undefined);
  useEffect(() => {
    const manager = cps?.cpsManager;
    if (!manager) return;
    let cancelled = false;
    manager.whenReady().then(() => {
      if (cancelled) return;
      const routing = manager.getDefaultProjectRouting();
      setProjectRouting(
        routing === PROJECT_ROUTING_ALL || routing === PROJECT_ROUTING_ORIGIN ? routing : undefined
      );
    });
    return () => {
      cancelled = true;
    };
  }, [cps?.cpsManager]);

  const toasts = useToasts();

  const { dataView, status } = useDataView(PageScope.default);
  const dataViewIndexPattern = dataView ? dataView.getIndexPattern() : undefined;

  // Interpret the clicked node and route it to the appropriate consumer-provided preview opener.
  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const singleDocumentData = getSingleDocumentData(node);
      const docMode = getNodeDocumentMode(node);
      const documentsData = (node.documentsData ?? []) as NodeDocumentDataModel[];

      if ((docMode === 'single-event' || docMode === 'single-alert') && singleDocumentData) {
        onShowDocument(singleDocumentData.id, singleDocumentData.index, docMode === 'single-event');
      } else if (docMode === 'single-entity' && singleDocumentData && isEntityNodeEnriched(node)) {
        // Prefer typed Host/User/Service flyout (more detailed) over Generic Entity.
        onShowEntity({
          engineType: resolveEntityEngineType(node, singleDocumentData.entity),
          entityId: singleDocumentData.id,
          entityName: resolveEntityDisplayName(node, singleDocumentData.entity, singleDocumentData.id),
          graphNodeId: node.id,
        });
      } else if (docMode === 'grouped-entities' && documentsData.length > 0) {
        const entityItems = documentsData
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .filter(
            (doc): doc is NodeDocumentDataModel & { entity: EntityDocumentDataModel } =>
              doc.entity !== undefined
          )
          .map((doc) => {
            const riskFromFields = doc.entity.sourceFields?.risk;
            const risk =
              typeof riskFromFields === 'number'
                ? riskFromFields
                : typeof riskFromFields === 'string'
                ? Number(riskFromFields)
                : undefined;
            return {
              itemType: DOCUMENT_TYPE_ENTITY,
              entity: doc.entity,
              id: doc.id,
              // Member cards use entity-type icons (storage/user), not the group brand SVG.
              icon:
                doc.entity.engine_type === 'user' || doc.entity.type?.toLowerCase() === 'user'
                  ? 'user'
                  : doc.entity.engine_type === 'service' ||
                    doc.entity.type?.toLowerCase() === 'service'
                  ? 'package'
                  : 'storage',
              label: doc.entity.name,
              risk: Number.isFinite(risk) ? risk : undefined,
            };
          });
        const groupLabel =
          'label' in node && typeof node.label === 'string' && node.label.length > 0
            ? node.label
            : undefined;
        onShowGrouped({
          docMode,
          entityItems,
          documentIds: [],
          dataViewId: undefined,
          graphNodeId: node.id,
          groupTitle: groupLabel
            ? `${entityItems.length} ${
                entityItems.length === 1 || groupLabel.endsWith('s')
                  ? groupLabel
                  : `${groupLabel}s`
              }`
            : undefined,
        });
      } else if (docMode === 'grouped-events' && documentsData.length > 0) {
        const documentIds = documentsData
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .map((doc) => doc.event?.id)
          .filter((id): id is string => id !== undefined);
        onShowGrouped({
          docMode,
          documentIds,
          dataViewId: dataViewIndexPattern,
          entityItems: [],
          graphNodeId: node.id,
        });
      } else {
        toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.flyout.graph.errorOpenNodePreview', {
            defaultMessage: 'Failed showing preview',
          }),
        });
      }
    },
    [onShowDocument, onShowEntity, onShowGrouped, dataViewIndexPattern, toasts]
  );

  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(
    (query: Query | undefined, filters: Filter[], timeRange: TimeRange) => {
      const from = dateMath.parse(timeRange.from);
      const to = dateMath.parse(timeRange.to);

      if (!from || !to) {
        toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.flyout.graph.errorInvalidTimeRange', {
            defaultMessage: 'Invalid time range',
          }),
          text: i18n.translate(
            'xpack.securitySolution.flyout.graph.errorInvalidTimeRangeDescription',
            {
              defaultMessage: 'Please select a valid time range.',
            }
          ),
        });
        return;
      }

      const normalizedTimeRange = normalizeTimeRange({
        ...timeRange,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      investigateInTimeline({
        keepDataView: true,
        query,
        filters,
        timeRange: {
          from: normalizedTimeRange.from,
          to: normalizedTimeRange.to,
          kind: 'absolute',
        },
      });
    },
    [investigateInTimeline, toasts]
  );

  return (
    <div
      ref={wrapperRef}
      data-test-subj={GRAPH_VISUALIZATION_TEST_ID}
      css={css`
        height: ${height}px;
        width: 100%;
      `}
    >
      {status === 'ready' && (
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <GraphInvestigationLazy
            scopeId={scopeId}
            originRiskScore={props.mode === 'entity' ? props.originRiskScore : undefined}
            originEntityName={props.mode === 'entity' ? props.entityName : undefined}
            initialState={
              props.mode === 'event'
                ? {
                    dataView,
                    originEventIds: props.eventIds.map((id) => ({ id, isAlert: props.isAlert })),
                    timeRange: {
                      from: `${props.timestamp}||-30m`,
                      to: `${props.timestamp}||+30m`,
                    },
                    projectRouting,
                  }
                : {
                    dataView,
                    entityIds: [{ id: props.entityId, isOrigin: true }],
                    timeRange: {
                      from: 'now-30d',
                      to: 'now',
                    },
                    projectRouting,
                  }
            }
            showInvestigateInTimeline={hasTimelineAccess}
            showToggleSearch={true}
            entityActionsMode="hover"
            entityStyleMode="colored"
            onInvestigateInTimeline={openTimelineCallback}
            onOpenEventPreview={onOpenEventPreview}
            onOpenNetworkPreview={onShowNetwork}
            selectedNodeIds={selectedNodeIds}
            onPaneClick={onClearDetailsSelection}
          />
        </React.Suspense>
      )}
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
