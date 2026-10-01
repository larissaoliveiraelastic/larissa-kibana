/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import {
  GRAPH_BACKGROUND_COLOR,
  GRAPH_BACKGROUND_DOT_COLOR,
  GRAPH_BACKGROUND_DOT_GAP,
  GRAPH_BACKGROUND_DOT_SIZE,
} from '@kbn/cloud-security-posture-graph/src/components/constants';
import { getSpanIcon } from '@kbn/cloud-security-posture-graph/src/components/node/get_span_icon';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

/** Resolve brand SVG icons (aws_ec2, …) the same way expanded graph cards do. */
const resolvePreviewIcon = (icon?: string): IconType | undefined => {
  if (!icon) return undefined;
  return getSpanIcon(icon) ?? icon;
};

/** Compact preview risk — whole numbers per Figma group preview (e.g. `90` / `50`). */
const formatPreviewRiskScore = (score: number): string => String(Math.round(score));

const ENTITY_SHAPES = new Set(['hexagon', 'pentagon', 'ellipse', 'rectangle', 'diamond']);

/**
 * Preview cards — Figma Graph preview (node 14842:2883).
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2/-9.5--Graph-viz---Component-Library?node-id=14842-2883
 */
const NODE_PILL_BORDER_RADIUS = 12;
/** Figma Entity Icon: size/small = 8px. */
const NODE_ICON_BORDER_RADIUS = 8;
/** Figma preview entity card icon (24px glyph in 32px box). */
const NODE_ICON_SIZE = 24;
const NODE_ICON_BOX_SIZE = 32;
/** Figma card padding (8px). */
const NODE_PILL_PADDING = 8;
const PREVIEW_CANVAS_PADDING = 12;
const PREVIEW_CANVAS_MIN_HEIGHT = 200;
const RISK_BADGE_HEIGHT = 20;
/** Figma Badge spaces/s = 8px. */
const RISK_BADGE_PADDING_X = 8;
/** Floor for dual range badges `50 - 90` (two pills + dash + gaps). */
const RISK_RANGE_MIN_CONTENT_WIDTH = 82;
/** Outline count pill beside group subtype title. */
const GROUP_COUNT_PILL_SIZE = 28;
/**
 * Subtype label floor when the flyout is at minimum width ("AWS…" / "GCP…").
 * No max — when the preview grows, the label expands to the full subtype name.
 */
const GROUP_SUBTYPE_LABEL_MIN_WIDTH = 36;
/** Figma: 8px between entity icon and name column. */
const NODE_ICON_TO_TEXT_GAP = 8;
/** Figma: 4px between header children (icon/count/subtype/risk). */
const GROUP_HEADER_GAP = 4;

/**
 * Card floors for the narrowest flyout (Figma preview ~161 / ~206).
 * Cards grow with the preview container — no hard max — so names un-truncate
 * on resize instead of staying clipped at the compact Figma width.
 */
const PREVIEW_CARD_MIN_WIDTH = 140;
const PREVIEW_GROUP_CARD_MIN_WIDTH =
  NODE_PILL_PADDING * 2 +
  NODE_ICON_BOX_SIZE +
  GROUP_HEADER_GAP +
  GROUP_COUNT_PILL_SIZE +
  GROUP_HEADER_GAP +
  GROUP_SUBTYPE_LABEL_MIN_WIDTH +
  GROUP_HEADER_GAP +
  RISK_RANGE_MIN_CONTENT_WIDTH;
/** Figma stack: second group at y=130 after first at y=58 (h=48) → 24px gap. */
const GROUP_STACK_GAP = 24;
const CONNECTOR_GAP = 8;
const FANOUT_WIDTH = 28;
const ARROW_SIZE = 5;
/** Relationships trunk floor — keep “5 rela…” readable next to cards. */
const RELATIONSHIPS_TRUNK_MIN_WIDTH = 64;

type PreviewEntityNode = {
  id: string;
  label?: string;
  icon?: string;
  tag?: string;
  color?: string;
  count?: number;
  /** Entity subtype — group cards show this as the title. */
  subType?: string;
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
};

type PreviewRiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

type RiskGroup = {
  level: PreviewRiskLevel;
  count: number;
  /** Representative score shown on the badge (max in the group). */
  riskScore: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  icon?: string;
  /** Subtype title for API group cards (e.g. "GCP Compute Instance"). */
  label?: string;
};

const RISK_LEVEL_ORDER: PreviewRiskLevel[] = [
  'critical',
  'high',
  'moderate',
  'low',
  'unknown',
];

const stripEntityPrefix = (id: string): string => id.replace(/^(user|host|service):/i, '');

const entityIdsMatch = (a: string, b: string): boolean => {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  return (
    left === right ||
    stripEntityPrefix(left) === stripEntityPrefix(right) ||
    left === stripEntityPrefix(right) ||
    stripEntityPrefix(left) === right
  );
};

/**
 * Pick the graph origin entity for the left preview card.
 * `extractEdges` reverses node order, so `nodes[0]` is often NOT the origin.
 */
const pickMainEntityNode = (
  entityNodes: PreviewEntityNode[],
  edges: EdgeDataModel[],
  originEntityId?: string
): PreviewEntityNode | null => {
  if (entityNodes.length === 0) return null;

  if (originEntityId) {
    const byId = entityNodes.find((node) => entityIdsMatch(node.id, originEntityId));
    if (byId) return byId;
    const byLabel = entityNodes.find(
      (node) => node.label != null && entityIdsMatch(node.label, originEntityId)
    );
    if (byLabel) return byLabel;
  }

  const outbound = new Map<string, number>();
  edges.forEach((edge) => {
    const source = (edge as { source?: string }).source;
    if (!source) return;
    outbound.set(source, (outbound.get(source) ?? 0) + 1);
  });

  return entityNodes.reduce((best, node) => {
    const score = outbound.get(node.id) ?? 0;
    const bestScore = outbound.get(best.id) ?? 0;
    return score > bestScore ? node : best;
  });
};

const isEntityNode = (node: NodeDataModel): boolean =>
  ENTITY_SHAPES.has((node as { shape?: string }).shape ?? '');

/** Relationship + event/alert pills — same nodes the expanded graph renders. */
const isConnectorNode = (node: NodeDataModel): boolean => {
  const shape = (node as { shape?: string }).shape;
  return shape === 'relationship' || shape === 'label';
};
const getPreviewRiskLevel = (score?: number): PreviewRiskLevel => {
  if (score === undefined) return 'unknown';
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'unknown';
};

const resolveNodeRiskScore = (node: PreviewEntityNode): number | undefined =>
  node.riskScore ?? node.riskScoreMax ?? node.riskScoreMin;

/**
 * Preview risk badge tones — light severity fill + accent text (Figma Graph preview).
 * Icon on the card stays neutral; only the badge uses these colors.
 */
const getPreviewRiskTone = (
  level: PreviewRiskLevel,
  colors: {
    backgroundLightDanger: string;
    backgroundLightRisk: string;
    backgroundLightWarning: string;
    backgroundLightNeutral: string;
    backgroundLightText: string;
    textDanger: string;
    textRisk: string;
    textWarning: string;
    textNeutral: string;
    textParagraph: string;
  }
) => {
  switch (level) {
    case 'critical':
      return { badgeBg: colors.backgroundLightDanger, badgeText: colors.textDanger };
    case 'high':
      return { badgeBg: colors.backgroundLightRisk, badgeText: colors.textRisk };
    case 'moderate':
      return { badgeBg: colors.backgroundLightWarning, badgeText: colors.textWarning };
    case 'low':
      return { badgeBg: colors.backgroundLightNeutral, badgeText: colors.textNeutral };
    case 'unknown':
    default:
      return { badgeBg: colors.backgroundLightText, badgeText: colors.textParagraph };
  }
};

/** Group neighbor entities by Entity Analytics risk bands; badge shows the max score in the band. */
const groupNeighborsByRisk = (neighbors: PreviewEntityNode[]): RiskGroup[] => {
  const buckets = new Map<PreviewRiskLevel, { count: number; riskScore: number; icon?: string }>();

  neighbors.forEach((neighbor) => {
    const score = resolveNodeRiskScore(neighbor);
    const level = getPreviewRiskLevel(score);
    const existing = buckets.get(level);
    if (!existing) {
      buckets.set(level, {
        count: 1,
        riskScore: score ?? 0,
        icon: neighbor.icon,
      });
      return;
    }
    existing.count += 1;
    if (score !== undefined) {
      existing.riskScore = Math.max(existing.riskScore, score);
    }
    if (!existing.icon && neighbor.icon) {
      existing.icon = neighbor.icon;
    }
  });

  return RISK_LEVEL_ORDER.flatMap((level) => {
    const bucket = buckets.get(level);
    if (!bucket) return [];
    return [
      {
        level,
        count: bucket.count,
        riskScore: bucket.riskScore,
        icon: bucket.icon,
      },
    ];
  });
};

/**
 * Prefer API group nodes (count > 1) as distinct preview cards — keeps subtype grouping.
 * Fall back to risk-band aggregation for single-entity neighbors.
 */
const groupNeighborsForPreview = (neighbors: PreviewEntityNode[]): RiskGroup[] => {
  const apiGroups: RiskGroup[] = [];
  const singles: PreviewEntityNode[] = [];

  neighbors.forEach((neighbor) => {
    if ((neighbor.count ?? 0) > 1) {
      const score = resolveNodeRiskScore(neighbor);
      apiGroups.push({
        level: getPreviewRiskLevel(score),
        count: neighbor.count!,
        riskScore: score ?? 0,
        riskScoreMin: neighbor.riskScoreMin,
        riskScoreMax: neighbor.riskScoreMax,
        // Real subtype icon — same rule as expanded graph group cards.
        icon: neighbor.icon,
        // Group title is the entity subtype (aggregated by subtype).
        label: neighbor.subType ?? neighbor.label,
      });
      return;
    }
    singles.push(neighbor);
  });

  const combined = [...apiGroups, ...groupNeighborsByRisk(singles)];
  return RISK_LEVEL_ORDER.flatMap((level) => combined.filter((group) => group.level === level));
};

/**
 * Props for the GraphPreview component.
 */
export interface GraphPreviewProps {
  /**
   * Indicates whether the graph is currently loading.
   */
  isLoading: boolean;

  /**
   * Indicates whether there was an error loading the graph.
   */
  isError: boolean;

  /**
   * Optional data for the graph, including nodes and edges.
   */
  data?: {
    nodes: NodeDataModel[];
    edges: EdgeDataModel[];
  };

  /**
   * Entity that opened the flyout / centered the graph (`entity.id` or name).
   * Used so the left preview card matches the origin (icon + risk badge).
   */
  originEntityId?: string;

  /**
   * Flyout Entity risk (`calculated_score_norm`).
   * - `number` → origin badge uses this score (must match flyout)
   * - `null` → Unknown — show Unknown badge (do not use mock Critical)
   * - `undefined` → fall back to graph node riskScore
   */
  originRiskScore?: number | null;
}

const LoadingComponent = () => (
  <EuiSkeletonText
    data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
    contentAriaLabel={i18n.translate(
      'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
      {
        defaultMessage: 'graph preview',
      }
    )}
  />
);

interface PreviewRiskBadgeProps {
  score: number;
}

/**
 * Compact risk score pill — hug content (never stretch full card width).
 * Light severity fill + accent text, matching Figma Graph preview cards.
 */
const PreviewRiskBadge = ({ score }: PreviewRiskBadgeProps) => {
  const { euiTheme } = useEuiTheme();
  const tone = getPreviewRiskTone(getPreviewRiskLevel(score), euiTheme.colors);

  return (
    <EuiBadge
      color="hollow"
      data-test-subj="graph-preview-risk-badge"
      css={css`
        display: inline-flex !important;
        width: fit-content !important;
        max-width: max-content;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        align-self: flex-start;
        height: ${RISK_BADGE_HEIGHT}px;
        padding: 0 ${RISK_BADGE_PADDING_X}px;
        background-color: ${tone.badgeBg};
        color: ${tone.badgeText};
        border: none;
        border-radius: 999px;
        font-weight: ${euiTheme.font.weight.medium};
        font-size: 12px;
        line-height: ${euiTheme.size.base};
      `}
    >
      {formatPreviewRiskScore(score)}
    </EuiBadge>
  );
};

/** Matches flyout Entity risk when level is Unknown. */
const PreviewUnknownRiskBadge = () => {
  const { euiTheme } = useEuiTheme();
  const tone = getPreviewRiskTone('unknown', euiTheme.colors);
  const label = i18n.translate(
    'xpack.securitySolution.flyout.right.visualizations.graphPreview.unknownRisk',
    { defaultMessage: 'Unknown' }
  );

  return (
    <EuiBadge
      color="hollow"
      data-test-subj="graph-preview-risk-badge"
      css={css`
        display: inline-flex !important;
        width: fit-content !important;
        max-width: max-content;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        align-self: flex-start;
        height: ${RISK_BADGE_HEIGHT}px;
        padding: 0 ${RISK_BADGE_PADDING_X}px;
        background-color: ${tone.badgeBg};
        color: ${tone.badgeText};
        border: none;
        border-radius: 999px;
        font-weight: ${euiTheme.font.weight.medium};
        font-size: 12px;
        line-height: ${euiTheme.size.base};
      `}
    >
      {label}
    </EuiBadge>
  );
};

interface NodeCardProps {
  label: string;
  icon?: IconType;
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  /** When true, show Unknown badge instead of a numeric risk score. */
  riskUnknown?: boolean;
  isGroup?: boolean;
  count?: number;
  entityTypeLabel?: string;
}

/**
 * Preview entity card — Figma Graph preview (14842:2883):
 * Single: [icon 8px] name/Host  [4px] [risk]
 * Group:  [icon] [4px] [count] [4px] subtype [4px] [min] - [max] + stack
 */
const NodeCard = ({
  label,
  icon,
  riskScore,
  riskScoreMin,
  riskScoreMax,
  riskUnknown = false,
  isGroup = false,
  count,
  entityTypeLabel = 'Host',
}: NodeCardProps) => {
  const { euiTheme } = useEuiTheme();
  const fillColor = euiTheme.colors.backgroundBasePlain;
  const borderColor = euiTheme.colors.borderBasePlain;
  const iconBg = euiTheme.colors.backgroundBaseSubdued;
  const iconColor = '#000000';
  // Brand SVGs (aws_ec2, gcp_compute, …) keep their own fills — don't force black.
  const usesBrandSvg = typeof icon !== 'string';

  // Group range: min first, then max (e.g. 50 - 90) — same as expanded graph.
  const riskRangeLow =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.min(riskScoreMin, riskScoreMax)
      : undefined;
  const riskRangeHigh =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.max(riskScoreMin, riskScoreMax)
      : undefined;

  const riskBadges = riskUnknown ? (
    <PreviewUnknownRiskBadge />
  ) : riskRangeLow !== undefined && riskRangeHigh !== undefined ? (
    <div
      css={css`
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 2px;
        max-width: 100%;
      `}
    >
      <PreviewRiskBadge score={riskRangeLow} />
      <EuiText
        size="xs"
        css={css`
          flex: 0 0 auto;
          color: ${euiTheme.colors.textSubdued};
          line-height: ${euiTheme.size.base};
          font-size: 12px;
        `}
      >
        {'-'}
      </EuiText>
      <PreviewRiskBadge score={riskRangeHigh} />
    </div>
  ) : riskScore !== undefined ? (
    <PreviewRiskBadge score={riskScore} />
  ) : null;

  const entityIcon =
    icon != null ? (
      <div
        css={css`
          width: ${NODE_ICON_BOX_SIZE}px;
          height: ${NODE_ICON_BOX_SIZE}px;
          border-radius: ${NODE_ICON_BORDER_RADIUS}px;
          background: ${iconBg};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        `}
      >
        <EuiIcon
          type={icon}
          size="l"
          color={usesBrandSvg ? undefined : iconColor}
          aria-hidden={true}
          css={css`
            svg {
              width: ${NODE_ICON_SIZE}px;
              height: ${NODE_ICON_SIZE}px;
            }
          `}
        />
      </div>
    ) : null;

  return (
    <div
      css={css`
        position: relative;
        box-sizing: border-box;
        /* Always fill the grid/flex slot — names grow with the flyout. */
        width: 100%;
        max-width: 100%;
        min-width: 0;
        flex-shrink: 1;
        margin-bottom: ${isGroup ? 6 : 0}px;
      `}
    >
      {isGroup && (
        <div
          aria-hidden={true}
          css={css`
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: -4px;
            height: 5px;
            border-left: 1px solid ${borderColor};
            border-right: 1px solid ${borderColor};
            border-bottom: 1px solid ${borderColor};
            border-radius: 0 0 ${NODE_PILL_BORDER_RADIUS}px ${NODE_PILL_BORDER_RADIUS}px;
            background: ${fillColor};
            opacity: 0.8;
            z-index: 0;
          `}
        />
      )}
      <div
        css={css`
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: ${GROUP_HEADER_GAP}px;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          border: 1px solid ${borderColor};
          border-radius: ${NODE_PILL_BORDER_RADIUS}px;
          padding: ${NODE_PILL_PADDING}px;
          background: ${fillColor};
          box-shadow: 0 1px 2px 0 rgba(7, 16, 31, 0.06);
        `}
      >
        {isGroup ? (
          <>
            {entityIcon}
            {count !== undefined && (
              <EuiBadge
                color="hollow"
                css={css`
                  flex-shrink: 0;
                  height: ${RISK_BADGE_HEIGHT}px;
                  display: inline-flex;
                  align-items: center;
                  padding: 0 ${RISK_BADGE_PADDING_X}px;
                  font-weight: ${euiTheme.font.weight.medium};
                  font-size: 12px;
                  line-height: ${euiTheme.size.base};
                `}
              >
                {count > 99 ? '99+' : count}
              </EuiBadge>
            )}
            <EuiText
              size="xs"
              title={label}
              css={css`
                /* Grow into free card space; ellipsis only when the flyout is narrow. */
                flex: 1 1 0;
                min-width: 0;
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.textParagraph};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: ${euiTheme.size.base};
              `}
            >
              {label}
            </EuiText>
            <div
              css={css`
                flex: 0 0 auto;
              `}
            >
              {riskBadges}
            </div>
          </>
        ) : (
          <>
            <div
              css={css`
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: ${NODE_ICON_TO_TEXT_GAP}px;
                min-width: 0;
                flex: 1 1 0;
              `}
            >
              {entityIcon}
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  align-items: stretch;
                  min-width: 0;
                  flex: 1 1 0;
                  overflow: hidden;
                `}
              >
                <EuiText
                  size="xs"
                  title={label}
                  css={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${euiTheme.colors.textParagraph};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    line-height: ${euiTheme.size.base};
                  `}
                >
                  {label}
                </EuiText>
                <EuiText
                  size="xs"
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    white-space: nowrap;
                    line-height: ${euiTheme.size.base};
                    font-weight: ${euiTheme.font.weight.regular};
                  `}
                >
                  {entityTypeLabel}
                </EuiText>
              </div>
            </div>
            <div
              css={css`
                flex: 0 0 auto;
              `}
            >
              {riskBadges}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface RelationshipsPillProps {
  count: number;
}

const RelationshipsPill = ({ count }: RelationshipsPillProps) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate(
    'xpack.securitySolution.flyout.right.visualizations.graphPreview.relationshipsCount',
    {
      defaultMessage: '{count} {count, plural, one {Relationship} other {Relationships}}',
      values: { count },
    }
  );

  return (
    <div
      data-test-subj="graph-preview-relationships-pill"
      title={label}
      css={css`
        position: relative;
        z-index: 1;
        flex-shrink: 1;
        box-sizing: border-box;
        height: 32px;
        /* Keep enough room to show at least "5 rela…" */
        min-width: 56px;
        max-width: 100%;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 99px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 1px solid ${euiTheme.colors.borderBasePlain};
        white-space: nowrap;
        overflow: hidden;
        /* Cover the connector line so it never shows through the pill */
        box-shadow: 0 0 0 3px ${GRAPH_BACKGROUND_COLOR};
      `}
    >
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          /* Figma Fine print / Semi bold ~10.5 */
          font-size: 10.5px;
          color: ${euiTheme.colors.textParagraph};
          line-height: ${euiTheme.size.base};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {label}
      </EuiText>
    </div>
  );
};

/**
 * Fan-out from the relationships trunk to each risk-group card.
 * Uses SVG so branches share one continuous stroke (no floating stubs / gaps).
 */
const FanOutConnectors = ({
  groupCount,
  edgeColor,
}: {
  groupCount: number;
  edgeColor: string;
}) => {
  if (groupCount <= 0) return null;

  const vbW = 100;
  const vbH = 100;
  const spineX = 28;
  const endX = 92;
  const midY = 50;

  const rowYs =
    groupCount === 1
      ? [midY]
      : Array.from({ length: groupCount }, (_, i) => {
          // Center of each equal-height row in the stack
          return ((i + 0.5) / groupCount) * vbH;
        });

  const spineTop = rowYs[0];
  const spineBottom = rowYs[rowYs.length - 1];

  // Spine + branches only — the horizontal trunk through the pill is drawn by the parent.
  const spinePath =
    groupCount > 1 ? `M ${spineX} ${spineTop} L ${spineX} ${spineBottom}` : '';

  return (
    <svg
      aria-hidden={true}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      css={css`
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
        z-index: 0;
      `}
    >
      {/* Short stub from left edge into the spine so it meets the pill trunk */}
      <line
        x1={0}
        y1={midY}
        x2={spineX}
        y2={midY}
        stroke={edgeColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {spinePath && (
        <path
          d={spinePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {rowYs.map((y, index) => (
        <line
          key={`fan-${index}`}
          x1={spineX}
          y1={y}
          x2={endX}
          y2={y}
          stroke={edgeColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
};

/** Non-scaling arrow heads positioned at each card's vertical center. */
const FanOutArrows = ({
  groupCount,
  edgeColor,
}: {
  groupCount: number;
  edgeColor: string;
}) => {
  if (groupCount <= 0) return null;
  const rowPercents = Array.from(
    { length: groupCount },
    (_, i) => ((i + 0.5) / groupCount) * 100
  );

  return (
    <>
      {rowPercents.map((pct, index) => (
        <div
          key={`arrow-${index}`}
          aria-hidden={true}
          css={css`
            position: absolute;
            right: 0;
            top: ${pct}%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: ${ARROW_SIZE / 2 + 1}px solid transparent;
            border-bottom: ${ARROW_SIZE / 2 + 1}px solid transparent;
            border-left: ${ARROW_SIZE}px solid ${edgeColor};
            z-index: 1;
            pointer-events: none;
          `}
        />
      ))}
    </>
  );
};

/**
 * Graph preview under Overview → Visualizations.
 *
 * Pattern (Figma): origin entity card with risk badge → relationships pill →
 * neighbor groups stacked by risk severity (each with count + risk badge).
 */
export const GraphPreview: React.FC<GraphPreviewProps> = memo(
  ({ isLoading, isError, data, originEntityId, originRiskScore }: GraphPreviewProps) => {
    const { euiTheme } = useEuiTheme();

    const { mainNode, relationshipCount, riskGroups } = useMemo(() => {
      const nodes = data?.nodes ?? [];
      const edges = data?.edges ?? [];

      const entityNodes = nodes.filter(isEntityNode).map((node) => node as PreviewEntityNode);
      if (entityNodes.length === 0) {
        return { mainNode: null, relationshipCount: 0, riskGroups: [] as RiskGroup[] };
      }

      const main = pickMainEntityNode(entityNodes, edges, originEntityId);
      if (!main) {
        return { mainNode: null, relationshipCount: 0, riskGroups: [] as RiskGroup[] };
      }

      const adjacency = new Map<string, Set<string>>();
      const addLink = (a: string, b: string) => {
        if (!a || !b || a === b) return;
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        adjacency.get(a)!.add(b);
      };
      edges.forEach((edge) => {
        const e = edge as { source: string; target: string };
        addLink(e.source, e.target);
        addLink(e.target, e.source);
      });

      const direct = adjacency.get(main.id) ?? new Set<string>();
      const neighborIds = new Set<string>();
      direct.forEach((mid) => {
        if (entityNodes.some((n) => n.id === mid)) {
          neighborIds.add(mid);
          return;
        }
        (adjacency.get(mid) ?? new Set()).forEach((hop) => {
          if (hop !== main.id) neighborIds.add(hop);
        });
      });

      const entityNeighbors = [...neighborIds]
        .map((id) => entityNodes.find((n) => n.id === id))
        .filter((neighbor): neighbor is PreviewEntityNode => Boolean(neighbor));

      const groups = groupNeighborsForPreview(entityNeighbors);
      // Must match expanded graph: same relationship/event pills, same count.
      // Do not invent a smaller number via edge-hop heuristics.
      const relationships = nodes.filter(isConnectorNode).length;

      return {
        mainNode: main,
        relationshipCount: relationships,
        riskGroups: groups,
      };
    }, [data, originEntityId]);
    if (isLoading) return <LoadingComponent />;

    if (isError || !mainNode) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.graphPreview.errorDescription"
          defaultMessage="An error is preventing this alert from being visualized."
        />
      );
    }

    // Figma: Borders/Base/Prominent for trunk, fan-out, and arrows
    const edgeColor = euiTheme.colors.borderBaseProminent;
    const canvasBorder = euiTheme.colors.borderBasePlain;
    const dotRadius = GRAPH_BACKGROUND_DOT_SIZE / 2;
    // Prefer flyout Entity risk so preview never shows mock Critical when flyout is Unknown.
    const originRiskUnknown = originRiskScore === null;
    const mainRiskScore = originRiskUnknown
      ? undefined
      : originRiskScore !== undefined
        ? originRiskScore
        : resolveNodeRiskScore(mainNode);
    const mainLabel =
      mainNode.label ??
      stripEntityPrefix(mainNode.id) ??
      i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.graphPreview.unknownEntity',
        { defaultMessage: 'Entity' }
      );

    return (
      <div
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        css={css`
          container-type: inline-size;
          container-name: graph-preview;
          box-sizing: border-box;
          /*
            Grid forces origin + group columns to share free width (1fr each).
            Flex alone left empty dotted space while cards stayed at content size.
          */
          display: grid;
          grid-template-columns:
            minmax(${PREVIEW_CARD_MIN_WIDTH}px, 1fr)
            minmax(${RELATIONSHIPS_TRUNK_MIN_WIDTH}px, max-content)
            minmax(${PREVIEW_GROUP_CARD_MIN_WIDTH + FANOUT_WIDTH}px, 1fr);
          align-items: center;
          column-gap: ${CONNECTOR_GAP}px;
          width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: ${PREVIEW_CANVAS_PADDING}px;
          padding-bottom: ${PREVIEW_CANVAS_PADDING + 8}px;
          min-height: ${PREVIEW_CANVAS_MIN_HEIGHT}px;
          border: 1px solid ${canvasBorder};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${GRAPH_BACKGROUND_COLOR};
          background-image: radial-gradient(
            ${GRAPH_BACKGROUND_DOT_COLOR} ${dotRadius}px,
            transparent ${dotRadius}px
          );
          background-size: ${GRAPH_BACKGROUND_DOT_GAP}px ${GRAPH_BACKGROUND_DOT_GAP}px;

          @container graph-preview (max-width: ${PREVIEW_CARD_MIN_WIDTH * 2 + RELATIONSHIPS_TRUNK_MIN_WIDTH + FANOUT_WIDTH + PREVIEW_CANVAS_PADDING * 2}px) {
            padding: 12px;
            column-gap: 4px;
            grid-template-columns:
              minmax(0, 1fr)
              minmax(56px, max-content)
              minmax(0, 1fr);
          }
        `}
      >
        {/* Origin entity — 1fr column grows with the flyout */}
        <div
          css={css`
            min-width: 0;
            width: 100%;
          `}
        >
          <NodeCard
            label={mainLabel}
            icon={mainNode.icon ?? 'storage'}
            riskScore={mainRiskScore}
            riskUnknown={originRiskUnknown}
          />
        </div>

        {/* Trunk through relationships pill */}
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: ${RELATIONSHIPS_TRUNK_MIN_WIDTH}px;
            max-width: 160px;
            width: 100%;
            position: relative;
            overflow: visible;
            justify-self: stretch;
          `}
        >
          <div
            aria-hidden={true}
            css={css`
              position: absolute;
              left: -${CONNECTOR_GAP}px;
              right: -2px;
              top: 50%;
              height: 1px;
              background: ${edgeColor};
              z-index: 0;
            `}
          />
          {relationshipCount > 0 && <RelationshipsPill count={relationshipCount} />}
        </div>

        {/* Fan-out + neighbor groups — 1fr column grows with the flyout */}
        {riskGroups.length > 0 ? (
          <div
            css={css`
              display: flex;
              flex-direction: row;
              align-items: stretch;
              min-width: 0;
              width: 100%;
            `}
          >
            <div
              css={css`
                position: relative;
                width: ${FANOUT_WIDTH}px;
                flex: 0 0 ${FANOUT_WIDTH}px;
                align-self: stretch;
                margin-right: 2px;
                overflow: visible;
              `}
            >
              <FanOutConnectors groupCount={riskGroups.length} edgeColor={edgeColor} />
              <FanOutArrows groupCount={riskGroups.length} edgeColor={edgeColor} />
            </div>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              responsive={false}
              css={css`
                flex: 1 1 auto;
                min-width: 0;
                width: 100%;
                gap: ${GROUP_STACK_GAP}px;
              `}
            >
              {riskGroups.map((group, index) => {
                const isGroup = group.count > 1;
                const groupLabel =
                  group.label ??
                  i18n.translate(
                    'xpack.securitySolution.flyout.right.visualizations.graphPreview.groupEntityCount',
                    {
                      defaultMessage:
                        '{count} {count, plural, one {Entity} other {Entities}}',
                      values: { count: group.count },
                    }
                  );
                return (
                  <EuiFlexItem
                    key={`${group.level}-${group.label ?? index}`}
                    grow={false}
                    css={css`
                      width: 100%;
                      min-width: 0;
                    `}
                  >
                    <NodeCard
                      isGroup={isGroup}
                      count={isGroup ? group.count : undefined}
                      icon={resolvePreviewIcon(group.icon) ?? 'storage'}
                      label={groupLabel}
                      riskScore={
                        group.riskScoreMin === undefined ? group.riskScore : undefined
                      }
                      riskScoreMin={group.riskScoreMin}
                      riskScoreMax={group.riskScoreMax}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </div>
        ) : (
          <div />
        )}
      </div>
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
