/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  lazy,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash/fp';
import {
  GraphGroupedNodePreviewPanel,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { FlowTargetSourceDest } from '../../../../../../common/search_strategy';
import { useDefaultDocumentFlyoutProperties } from '../../../../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../../../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../../../../shared/utils/build_flyout_nav_title';
import {
  ENTITY_GRAPH_VIEW_TITLE,
  EVENT_TITLE,
} from '../../../../shared/constants/flyout_titles';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { GraphVisualization } from '../../../../document/tools/graph/components/graph_visualization';
import { useFlyoutSessionContext } from '../../../../session_context';
import {
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
} from '../../../../../common/lib/telemetry';

/** Typed entity flyouts (flyout_v2) — safe inside the system flyout; not expandable HostPanel. */
const Host = lazy(() => import('../../../host/main').then((m) => ({ default: m.Host })));
const User = lazy(() => import('../../../user/main').then((m) => ({ default: m.User })));
const Service = lazy(() => import('../../../service/main').then((m) => ({ default: m.Service })));
const GenericEntity = lazy(() =>
  import('../../../generic/main').then((m) => ({ default: m.GenericEntity }))
);

const TITLE = ENTITY_GRAPH_VIEW_TITLE;
const DETAILS_PANEL_WIDTH = 420;
/** Nightshift card radius — details panel only. */
const PANEL_CARD_RADIUS = 16;
const PANEL_GUTTER = 12;
/** Panel slides this far from under the (fixed-size) graph flyout. */
const PANEL_SHIFT = DETAILS_PANEL_WIDTH + PANEL_GUTTER;
const PANEL_ENTER_MS = 360;
const PANEL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface OpenLayout {
  top: number;
  /** Graph flyout left edge — panel rests PANEL_SHIFT to its left. */
  left: number;
  height: number;
  zIndex: number;
}

const closePanelLabel = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.close',
  { defaultMessage: 'Close details' }
);

const backToGroupLabel = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.backToGroup',
  { defaultMessage: 'Back to group' }
);

const entityDetailsTitle = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.entityTitle',
  { defaultMessage: 'Entity details' }
);

const groupDetailsTitle = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.groupTitle',
  { defaultMessage: 'Entities' }
);

const hostDetailsTitle = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.hostTitle',
  { defaultMessage: 'Host' }
);

const userDetailsTitle = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.userTitle',
  { defaultMessage: 'User' }
);

const serviceDetailsTitle = i18n.translate(
  'xpack.securitySolution.flyoutV2.entity.graphView.detailsPanel.serviceTitle',
  { defaultMessage: 'Service' }
);

const resolveTypedEngine = (
  engineType: string | undefined
): 'host' | 'user' | 'service' | 'generic' => {
  const normalized = engineType?.toLowerCase();
  if (normalized === 'host' || normalized === 'user' || normalized === 'service') {
    return normalized;
  }
  return 'generic';
};

type GroupedPanelParams = Omit<
  GraphGroupedNodePreviewPanelProps,
  'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
>;

type GroupSidePanelState = {
  kind: 'group';
  params: GroupedPanelParams;
  /** e.g. "3 GCP Compute Instances" */
  title?: string;
};

type SidePanelState =
  | {
      kind: 'entity';
      engineType: string | undefined;
      entityId: string;
      entityName: string | undefined;
      /** When drilled in from a group listing, restore this panel on Back. */
      backToGroup?: GroupSidePanelState;
    }
  | GroupSidePanelState;

export interface GraphViewProps {
  /** Entity Store v2 id (`entity.id`) to center the graph on. */
  entityId: string;
  /** Scope id for the graph and the flyouts it opens. */
  scopeId: string;
  /** Display name of the originating entity (shown in the tool header). */
  entityName: string;
  /**
   * Flyout Entity risk (`calculated_score_norm`) — must match table + preview.
   */
  originRiskScore?: number | null;
  /**
   * Legacy callback — entity details now open in the left side panel beside the graph.
   * Kept for API compatibility with callers that still pass it.
   */
  onShowEntity?: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
  /** Opens the originating entity flyout as a child (via the header title button). */
  onShowOriginatingEntity?: () => void;
}

/**
 * Tool flyout for the Entity Graph.
 *
 * “Show entity details” opens a rounded side card beside the graph with the typed
 * Host/User/Service compact preview (`sidePanelPreview`: risk + criticality, no full flyout chrome).
 */
export const GraphView = memo(
  ({
    entityId,
    scopeId,
    entityName,
    originRiskScore,
    onShowOriginatingEntity,
  }: GraphViewProps) => {
    const { euiTheme } = useEuiTheme();
    const open = useOpenFlyout();
    const { historyKey } = useFlyoutSessionContext();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const { openDocumentFlyoutFromIndexAsChild, openNetworkFlyoutAsChild } = useFlyoutApi();
    const [sidePanel, setSidePanel] = useState<SidePanelState | null>(null);
    /** Graph flyout geometry — panel anchors to its left; flyout size is never changed here. */
    const [openLayout, setOpenLayout] = useState<OpenLayout | null>(null);
    const [panelEntered, setPanelEntered] = useState(false);
    /** React Flow node kept selected (blue border) while the details panel is open. */
    const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const flyoutRef = useRef<HTMLElement | null>(null);
    const panelElRef = useRef<HTMLDivElement | null>(null);
    const openLayoutRef = useRef<OpenLayout | null>(null);
    const closeTimeoutRef = useRef<number | null>(null);
    const syncRafRef = useRef<number | null>(null);

    const onShowDocument = useCallback(
      (documentId: string, indexName?: string, isEvent?: boolean) =>
        openDocumentFlyoutFromIndexAsChild({
          documentId,
          indexName,
          renderCellActions: cellActionRenderer,
          onAlertUpdated: noop,
          origin: FLYOUT_ORIGIN.GRAPH_DOCUMENT_NODE,
          title: isEvent ? EVENT_TITLE : undefined,
        }),
      [openDocumentFlyoutFromIndexAsChild]
    );

    const onShowNetwork = useCallback(
      (ip: string) =>
        openNetworkFlyoutAsChild({
          ip,
          flowTarget: FlowTargetSourceDest.source,
          origin: FLYOUT_ORIGIN.GRAPH_NETWORK_NODE,
        }),
      [openNetworkFlyoutAsChild]
    );

    const measureFlyoutLayout = useCallback((): OpenLayout | null => {
      const flyout = rootRef.current?.closest('.euiFlyout') as HTMLElement | null;
      flyoutRef.current = flyout;
      if (!flyout) return null;
      const rect = flyout.getBoundingClientRect();
      const zIndex = Number.parseInt(getComputedStyle(flyout).zIndex || '1000', 10) || 1000;
      return {
        top: rect.top,
        left: rect.left,
        height: rect.height,
        zIndex,
      };
    }, []);

    /** Keep the side panel glued to the flyout's left edge (incl. while dragging resize). */
    const applyPanelLayout = useCallback((layout: OpenLayout, commitReact: boolean) => {
      openLayoutRef.current = layout;
      const el = panelElRef.current;
      if (el) {
        el.style.top = `${layout.top}px`;
        el.style.left = `${layout.left - PANEL_SHIFT}px`;
        el.style.height = `${layout.height}px`;
        el.style.width = `${PANEL_SHIFT}px`;
      }
      if (commitReact) {
        setOpenLayout(layout);
      }
    }, []);

    const scheduleSyncFromFlyout = useCallback(
      (commitReact: boolean) => {
        if (syncRafRef.current != null) {
          window.cancelAnimationFrame(syncRafRef.current);
        }
        syncRafRef.current = window.requestAnimationFrame(() => {
          syncRafRef.current = null;
          const layout = measureFlyoutLayout();
          if (layout) applyPanelLayout(layout, commitReact);
        });
      },
      [measureFlyoutLayout, applyPanelLayout]
    );

    const openEntityInSidePanel = useCallback(
      (params: {
        engineType: string | undefined;
        entityId: string;
        entityName: string | undefined;
        graphNodeId?: string;
      }) => {
        if (closeTimeoutRef.current != null) {
          window.clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        setSidePanel((prev) => {
          const backToGroup =
            prev?.kind === 'group'
              ? prev
              : prev?.kind === 'entity'
              ? prev.backToGroup
              : undefined;
          return {
            kind: 'entity',
            engineType: params.engineType,
            entityId: params.entityId,
            entityName: params.entityName,
            backToGroup,
          };
        });
        // Keep the group node selected when drilling in from the group list.
        if (params.graphNodeId) {
          setSelectedGraphNodeId(params.graphNodeId);
        }
        if (!openLayoutRef.current) {
          const layout = measureFlyoutLayout();
          openLayoutRef.current = layout;
          setOpenLayout(layout);
          setPanelEntered(false);
        }
      },
      [measureFlyoutLayout]
    );

    const goBackToGroup = useCallback(() => {
      setSidePanel((prev) => {
        if (prev?.kind === 'entity' && prev.backToGroup) {
          return prev.backToGroup;
        }
        return prev;
      });
    }, []);

    const openGroupedInSidePanel = useCallback(
      (params: GroupedPanelParams & { graphNodeId?: string; groupTitle?: string }) => {
        if (closeTimeoutRef.current != null) {
          window.clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        const { graphNodeId, groupTitle, ...groupParams } = params;
        setSelectedGraphNodeId(graphNodeId ?? null);
        setSidePanel({ kind: 'group', params: groupParams, title: groupTitle });
        if (!openLayoutRef.current) {
          const layout = measureFlyoutLayout();
          openLayoutRef.current = layout;
          setOpenLayout(layout);
          setPanelEntered(false);
        }
      },
      [measureFlyoutLayout]
    );

    /** Events/alerts groups still open as tool flyouts (not entity side-panel). */
    const onShowGrouped = useCallback(
      (params: GroupedPanelParams & { graphNodeId?: string; groupTitle?: string }) => {
        if (params.docMode === 'grouped-entities') {
          openGroupedInSidePanel(params);
          return;
        }
        setSelectedGraphNodeId(null);
        const { graphNodeId: _graphNodeId, groupTitle: _groupTitle, ...groupParams } = params;
        open(
          <GraphGroupedNodePreviewPanel
            {...groupParams}
            scopeId={scopeId}
            onShowDocument={onShowDocument}
            onShowEntity={openEntityInSidePanel}
          />,
          {
            ...defaultFlyoutProperties,
            historyKey,
            session: FLYOUT_SESSION_KIND.INHERIT,
            title: buildFlyoutNavTitle(EVENT_TITLE),
          },
          {
            surface: FLYOUT_SURFACE.TOOL,
            tool: FLYOUT_TOOL.GRAPH_VIEW,
            session: FLYOUT_SESSION_KIND.INHERIT,
            origin: FLYOUT_ORIGIN.GRAPH_GROUPED_NODE,
          },
          FLYOUT_SESSION_KIND.INHERIT
        );
      },
      [
        scopeId,
        onShowDocument,
        openEntityInSidePanel,
        openGroupedInSidePanel,
        defaultFlyoutProperties,
        historyKey,
        open,
      ]
    );

    const closeSidePanel = useCallback(() => {
      setSelectedGraphNodeId(null);
      setPanelEntered(false);
      if (closeTimeoutRef.current != null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = window.setTimeout(() => {
        setSidePanel(null);
        setOpenLayout(null);
        openLayoutRef.current = null;
        closeTimeoutRef.current = null;
      }, PANEL_ENTER_MS);
    }, []);

    const clearDetailsSelection = useCallback(() => {
      if (sidePanel == null && selectedGraphNodeId == null) {
        return;
      }
      closeSidePanel();
    }, [sidePanel, selectedGraphNodeId, closeSidePanel]);

    const selectedNodeIds = useMemo(
      () => (selectedGraphNodeId ? [selectedGraphNodeId] : undefined),
      [selectedGraphNodeId]
    );

    useEffect(
      () => () => {
        if (closeTimeoutRef.current != null) {
          window.clearTimeout(closeTimeoutRef.current);
        }
        if (syncRafRef.current != null) {
          window.cancelAnimationFrame(syncRafRef.current);
        }
      },
      []
    );

    // Glue panel to flyout while open — ResizeObserver + live pointer tracking on drag.
    useEffect(() => {
      if (!sidePanel) return;

      const flyout =
        flyoutRef.current ?? (rootRef.current?.closest('.euiFlyout') as HTMLElement | null);
      if (!flyout) return;
      flyoutRef.current = flyout;

      const syncLive = () => scheduleSyncFromFlyout(false);
      const syncCommit = () => scheduleSyncFromFlyout(true);

      const onPointerMove = () => syncLive();
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        syncCommit();
      };

      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('.euiResizableButton, .euiFlyout__resizeButton')) return;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('resize', syncCommit);
      flyout.addEventListener('pointerdown', onPointerDown);

      const observer =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncLive) : undefined;
      observer?.observe(flyout);

      // Initial glue after mount.
      syncCommit();

      return () => {
        window.removeEventListener('resize', syncCommit);
        flyout.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        observer?.disconnect();
      };
    }, [sidePanel, scheduleSyncFromFlyout]);

    // Panel slides out from behind the flyout; flyout size/position stays put.
    useLayoutEffect(() => {
      if (!sidePanel || !openLayout || panelEntered) return;
      const frame = window.requestAnimationFrame(() => {
        setPanelEntered(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }, [sidePanel, openLayout, panelEntered]);

    const sidePanelTitle = useMemo(() => {
      if (!sidePanel) return '';
      if (sidePanel.kind === 'group') return sidePanel.title ?? groupDetailsTitle;
      const typed = resolveTypedEngine(sidePanel.engineType);
      const name = sidePanel.entityName;
      if (typed === 'host') return name ?? hostDetailsTitle;
      if (typed === 'user') return name ?? userDetailsTitle;
      if (typed === 'service') return name ?? serviceDetailsTitle;
      return name ?? entityDetailsTitle;
    }, [sidePanel]);

    const entityDetailsContent = useMemo(() => {
      if (!sidePanel || sidePanel.kind !== 'entity') return null;
      const { engineType, entityId: id, entityName: name } = sidePanel;
      switch (resolveTypedEngine(engineType)) {
        case 'host':
          return (
            <Host
              hostName={name ?? id}
              entityId={id}
              scopeId={scopeId}
              sidePanelPreview
            />
          );
        case 'user':
          return (
            <User
              userName={name ?? id}
              entityId={id}
              scopeId={scopeId}
              sidePanelPreview
            />
          );
        case 'service':
          return (
            <Service
              serviceName={name ?? id}
              entityId={id}
              scopeId={scopeId}
              sidePanelPreview
            />
          );
        default:
          return <GenericEntity entityId={id} scopeId={scopeId} />;
      }
    }, [sidePanel, scopeId]);

    const panelShellCss = css`
      box-sizing: border-box;
      /* Opaque white shell (card + gutter) so nothing behind peeks through the radius. */
      background: ${euiTheme.colors.backgroundBasePlain};
      /* Straight left edge; rounded only on the side facing the graph. */
      border-radius: 0 ${PANEL_CARD_RADIUS}px ${PANEL_CARD_RADIUS}px 0;
      box-shadow: 0 4px 16px 0 rgba(7, 16, 31, 0.12);
      overflow: hidden;
      isolation: isolate;
    `;

    const panelCardCss = css`
      box-sizing: border-box;
      width: ${DETAILS_PANEL_WIDTH}px;
      height: 100%;
      border-radius: 0 ${PANEL_CARD_RADIUS}px ${PANEL_CARD_RADIUS}px 0;
      border: ${euiTheme.border.thin};
      border-left: none;
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    `;

    const panelHeaderCss = css`
      flex: 0 0 auto;
      align-items: center;
      padding: ${euiTheme.size.m} ${euiTheme.size.base};
      border-bottom: ${euiTheme.border.thin};
      border-radius: 0 ${PANEL_CARD_RADIUS}px 0 0;
      background: ${euiTheme.colors.backgroundBasePlain};
      min-height: 0;
    `;

    const panelBodyCss = css`
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: 0 0 ${PANEL_CARD_RADIUS}px 0;
      background: ${euiTheme.colors.backgroundBasePlain};
    `;

    const detailsPortal =
      sidePanel &&
      openLayout &&
      createPortal(
        <div
          ref={panelElRef}
          data-test-subj="graphEntityDetailsSidePanel"
          css={panelShellCss}
          style={{
            position: 'fixed',
            top: openLayout.top,
            left: openLayout.left - PANEL_SHIFT,
            height: openLayout.height,
            /* Card width + gutter — white fill seals the gap against the graph. */
            width: PANEL_SHIFT,
            zIndex: Math.max(1, openLayout.zIndex - 1),
            transform: `translateX(${panelEntered ? 0 : PANEL_SHIFT}px)`,
            transition: `transform ${PANEL_ENTER_MS}ms ${PANEL_EASE}`,
            pointerEvents: 'auto',
          }}
        >
          <div css={panelCardCss}>
            {sidePanel.kind === 'group' ? (
              <>
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                  css={panelHeaderCss}
                >
                  <EuiFlexItem grow={true} css={{ minWidth: 0 }}>
                    <EuiTitle size="xs">
                      <h3
                        css={css`
                          margin: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        `}
                      >
                        {sidePanelTitle}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={closePanelLabel}
                      color="text"
                      size="xs"
                      onClick={closeSidePanel}
                      data-test-subj="graphEntityDetailsSidePanelClose"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <div css={panelBodyCss}>
                  <GraphGroupedNodePreviewPanel
                    {...sidePanel.params}
                    scopeId={scopeId}
                    hidePanelTitle
                    onShowDocument={onShowDocument}
                    onShowEntity={openEntityInSidePanel}
                  />
                </div>
              </>
            ) : (
              <div
                css={css`
                  ${panelBodyCss};
                  height: 100%;
                `}
              >
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                  css={css`
                    ${panelHeaderCss};
                    border-bottom: none;
                    padding-bottom: ${euiTheme.size.xs};
                  `}
                >
                  <EuiFlexItem grow={false}>
                    {sidePanel.kind === 'entity' && sidePanel.backToGroup ? (
                      <EuiButtonIcon
                        iconType="arrowLeft"
                        aria-label={backToGroupLabel}
                        color="text"
                        size="xs"
                        onClick={goBackToGroup}
                        data-test-subj="graphEntityDetailsSidePanelBack"
                      />
                    ) : (
                      <span />
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={closePanelLabel}
                      color="text"
                      size="xs"
                      onClick={closeSidePanel}
                      data-test-subj="graphEntityDetailsSidePanelClose"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <div
                  css={css`
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow: auto;
                  `}
                >
                  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                    {entityDetailsContent}
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      );

    return (
      <div ref={rootRef} css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onShowOriginatingEntity}
            label={entityName}
            iconType="graphApp"
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          css={css`
            .euiFlyoutBody__overflowContent {
              height: 100%;
              padding: 0;
            }
          `}
        >
          <GraphVisualization
            mode="entity"
            scopeId={scopeId}
            entityId={entityId}
            entityName={entityName}
            originRiskScore={originRiskScore}
            onShowDocument={onShowDocument}
            onShowEntity={openEntityInSidePanel}
            onShowNetwork={onShowNetwork}
            onShowGrouped={onShowGrouped}
            selectedNodeIds={selectedNodeIds}
            onClearDetailsSelection={clearDetailsSelection}
          />
        </EuiFlyoutBody>
        {detailsPortal}
      </div>
    );
  }
);

GraphView.displayName = 'GraphView';
