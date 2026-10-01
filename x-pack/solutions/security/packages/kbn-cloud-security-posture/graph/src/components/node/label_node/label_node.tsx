/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useEuiTheme } from '@elastic/eui';
import { NodeButton, NODE_LABEL_WIDTH } from '../styles';
import {
  EventHoverActionsToolbar,
  TEST_SUBJ_PILL_EXPAND_BTN,
} from '../event_hover_actions_toolbar';
import { useMultipleNodesSelected } from '../../../hooks/use_multiple_nodes_selected';
import type { LabelNodeViewModel, NodeProps } from '../../types';
import { GRAPH_LABEL_NODE_ID } from '../../test_ids';
import { GRAPH_NODE_SHADOW, GRAPH_SIMPLIFIED_ZOOM_THRESHOLD } from '../../constants';
import { useViewportZoom } from '../../../hooks/use_viewport_zoom';
import { analyzeDocuments } from './analyze_documents';
import { LabelNodeBadges } from './label_node_badges';
import { LabelNodeDetails } from './label_node_details';
import {
  EVENT_GROUP_STACK_HEIGHT,
  EVENT_PILL_HEIGHT,
  EVENT_PILL_LABEL_FONT_SIZE,
  EVENT_PILL_LABEL_LINE_HEIGHT,
  EVENT_PILL_PADDING_LEFT,
  EVENT_PILL_PADDING_X,
  EVENT_PILL_PADDING_Y,
  getEventPillBoxShadow,
  getEventPillColors,
  getEventPillTone,
  pillHandleStyle,
} from './event_pill_styles';
import { OriginNodeOutline } from '../origin_node_outline';

export const TEST_SUBJ_SHAPE = 'label-node-shape';
export const TEST_SUBJ_EXPAND_BTN = TEST_SUBJ_PILL_EXPAND_BTN;
export const TEST_SUBJ_TOOLTIP = 'label-node-tooltip';
export const TEST_SUBJ_LABEL_TEXT = 'label-node-text';
export const TEST_SUBJ_HANDLE = 'label-node-handle';
export const TEST_SUBJ_GROUP_STACK = 'label-node-group-stack';

/**
 * Fixed layout width matches Dagre/`NODE_LABEL_WIDTH` so event/alert pills
 * center on the edge corridor. Through-line keeps the edge continuous under the pill.
 *
 * Figma Event (14980:17219): Single | Group × Alert | Event × Default | Hover | Active | Active hover
 */
const LabelNodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  box-sizing: border-box;
  /* Layout corridor stays NODE_LABEL_WIDTH; pill may hug wider than the corridor. */
  width: ${NODE_LABEL_WIDTH}px;
  min-width: ${NODE_LABEL_WIDTH}px;
`;

const EdgeThroughLine = styled.div<{ $color: string }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${EVENT_PILL_HEIGHT / 2}px;
  height: 1px;
  transform: translateY(-50%);
  background: ${({ $color }) => $color};
  z-index: 0;
  pointer-events: none;
`;

const PillShell = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: none;
`;

/** Hug the pill width so the group stack matches the capsule, not the full corridor. */
const PillColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: max-content;
  max-width: none;
  margin: 0 auto;
`;

const pillHitTargetCss = css`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: auto;
  height: auto;

  button {
    width: 100%;
    height: 100%;
  }
`;

const EventPill = styled.div<{
  backgroundColor: string;
  boxShadowCss: string;
  hoverShadowCss: string;
}>`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 4px;
  width: max-content;
  max-width: none;
  height: ${EVENT_PILL_HEIGHT}px;
  min-height: ${EVENT_PILL_HEIGHT}px;
  /* 10px top/right/bottom; 14px left (+4 for label). */
  padding: ${EVENT_PILL_PADDING_Y}px ${EVENT_PILL_PADDING_X}px ${EVENT_PILL_PADDING_Y}px
    ${EVENT_PILL_PADDING_LEFT}px;
  border: none;
  border-radius: 999px;
  background: ${({ backgroundColor }) => backgroundColor};
  white-space: nowrap;
  ${({ boxShadowCss }) => boxShadowCss}
  transition: box-shadow 0.2s ease;

  .react-flow__node:not(.non-interactive):hover:not(.dragging) & {
    ${({ hoverShadowCss }) => hoverShadowCss}
  }
`;

/** Figma “grouped” layer under the pill — inset, bottom-only edges. */
const GroupStack = styled.div<{ $borderColor: string; $fillColor: string }>`
  box-sizing: border-box;
  height: ${EVENT_GROUP_STACK_HEIGHT}px;
  margin: 0 16px;
  pointer-events: none;
  border-left: 1px solid ${({ $borderColor }) => $borderColor};
  border-right: 1px solid ${({ $borderColor }) => $borderColor};
  border-bottom: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 0 0 8px 8px;
  background: ${({ $fillColor }) => $fillColor};
  opacity: 0.5;
`;

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const { id, selected, dragging } = props;
  const {
    label,
    uniqueEventsCount,
    uniqueAlertsCount,
    interactive,
    ips,
    countryCodes,
    nodeClick,
    expandButtonClick,
    eventClickHandler,
    relatedEventsClickHandler,
    relatedEventsActive,
    highlightAsOrigin = false,
  } = props.data as LabelNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const zoom = useViewportZoom();
  const isMultipleNodesSelected = useMultipleNodesSelected();
  const showExpandButton = interactive && !isMultipleNodesSelected;

  const text = label ?? id;
  const isActive = Boolean(selected || dragging);

  const numEvents = uniqueEventsCount ?? 0;
  const numAlerts = uniqueAlertsCount ?? 0;
  const analysis = useMemo(
    () => analyzeDocuments({ uniqueEventsCount: numEvents, uniqueAlertsCount: numAlerts }),
    [numEvents, numAlerts]
  );

  const isGroup =
    analysis.isGroupOfEvents ||
    analysis.isGroupOfAlerts ||
    analysis.isGroupOfEventsAndAlerts;

  // Figma: metadata (IP / geo) only on Single — never on Group.
  const showDetails = !isGroup && zoom >= GRAPH_SIMPLIFIED_ZOOM_THRESHOLD;

  const pillTone = getEventPillTone(analysis);
  const pillColors = getEventPillColors(pillTone, isActive, euiTheme);
  const pillBoxShadow = getEventPillBoxShadow(pillColors.borderColor, GRAPH_NODE_SHADOW);
  const edgeThroughColor = euiTheme.colors.borderBaseProminent;
  const originOutlineBorderColor =
    pillTone === 'alert' ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain;

  const labelTextCss = css`
    font-size: ${EVENT_PILL_LABEL_FONT_SIZE}px;
    line-height: ${EVENT_PILL_LABEL_LINE_HEIGHT}px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${pillColors.textColor};
    text-align: center;
    white-space: nowrap;
  `;

  const renderLabelText = () => (
    <span css={labelTextCss} data-test-subj={TEST_SUBJ_LABEL_TEXT}>
      {text}
    </span>
  );

  return (
    <LabelNodeContainer data-test-subj={GRAPH_LABEL_NODE_ID}>
      <EdgeThroughLine $color={edgeThroughColor} aria-hidden={true} />
      <PillShell>
        {highlightAsOrigin && (
          <OriginNodeOutline borderColor={originOutlineBorderColor} borderRadius="999px" />
        )}
        <PillColumn>
          <EventPill
            data-test-subj={TEST_SUBJ_SHAPE}
            backgroundColor={pillColors.backgroundColor}
            boxShadowCss={pillBoxShadow}
            hoverShadowCss={pillBoxShadow}
          >
            {renderLabelText()}
            <LabelNodeBadges
              analysis={analysis}
              isActive={isActive}
              onEventClick={eventClickHandler}
            />
          </EventPill>
          {isGroup && (
            <GroupStack
              data-test-subj={TEST_SUBJ_GROUP_STACK}
              $borderColor={euiTheme.colors.borderBasePrimary}
              $fillColor={euiTheme.colors.backgroundLightPrimary}
              aria-hidden={true}
            />
          )}
        </PillColumn>

        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} css={pillHitTargetCss} />
            {showExpandButton && (
              <EventHoverActionsToolbar
                onRelatedEventsClick={relatedEventsClickHandler}
                relatedEventsActive={relatedEventsActive}
                onExpandClick={(e, unToggleCallback) =>
                  expandButtonClick?.(e, props, unToggleCallback)
                }
              />
            )}
          </>
        )}
      </PillShell>

      {showDetails && <LabelNodeDetails ips={ips} countryCodes={countryCodes} />}

      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={pillHandleStyle}
      />
      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={pillHandleStyle}
      />
    </LabelNodeContainer>
  );
});

LabelNode.displayName = 'LabelNode';
