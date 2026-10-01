/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { NODE_LABEL_WIDTH, getRelationshipColors } from '../styles';
import {
  EventHoverActionsToolbar,
  TEST_SUBJ_PILL_EXPAND_BTN,
} from '../event_hover_actions_toolbar';
import { useMultipleNodesSelected } from '../../../hooks/use_multiple_nodes_selected';
import type { RelationshipNodeViewModel, NodeProps } from '../../types';
import {
  EVENT_GROUP_STACK_HEIGHT,
  EVENT_PILL_HEIGHT,
  EVENT_PILL_LABEL_FONT_SIZE,
  EVENT_PILL_LABEL_LINE_HEIGHT,
  EVENT_PILL_PADDING_LEFT,
  EVENT_PILL_PADDING_X,
  EVENT_PILL_PADDING_Y,
  getEventPillBoxShadow,
  pillHandleStyle,
} from '../label_node/event_pill_styles';
import { RelationshipTypeBadge } from '../label_node/label_node_badges';
import {
  GRAPH_RELATIONSHIP_NODE_ID,
  GRAPH_RELATIONSHIP_NODE_SHAPE_ID,
  GRAPH_RELATIONSHIP_NODE_HANDLE_ID,
  GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID,
} from '../../test_ids';
import { GRAPH_NODE_SHADOW } from '../../constants';
import { showStackedShape } from '../../utils';

export const TEST_SUBJ_RELATIONSHIP_EXPAND_BTN = TEST_SUBJ_PILL_EXPAND_BTN;
export const TEST_SUBJ_RELATIONSHIP_GROUP_STACK = 'relationship-node-group-stack';

/**
 * Figma Event → Relationship (14980:17219):
 * Single: [Action.name] [cluster icon badge]
 * Group:  same + count on badge + stack layer
 * Active: Strong/Primary border
 */
const RelationshipNodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
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

const RelationshipPill = styled.div<{
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

export const RelationshipNode = memo<NodeProps>((props: NodeProps) => {
  const { id, selected, dragging } = props;
  const {
    label,
    interactive,
    expandButtonClick,
    relatedEventsClickHandler,
    relatedEventsActive,
    count,
  } = props.data as RelationshipNodeViewModel & { count?: number };

  const isMultipleNodesSelected = useMultipleNodesSelected();
  const showExpandButton = interactive && !isMultipleNodesSelected;
  const isGroup = showStackedShape(count);
  const isActive = Boolean(selected || dragging);

  const { euiTheme } = useEuiTheme();

  const text = label ?? id;

  const { backgroundColor, borderColor, textColor } = useMemo(
    () => getRelationshipColors(euiTheme),
    [euiTheme]
  );
  const activeBorderColor = euiTheme.colors.borderStrongPrimary;
  const edgeThroughColor = euiTheme.colors.borderBaseProminent;
  const pillBorderColor = isActive ? activeBorderColor : borderColor;
  const pillBoxShadow = getEventPillBoxShadow(pillBorderColor, GRAPH_NODE_SHADOW);

  const labelTextCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${EVENT_PILL_LABEL_FONT_SIZE}px;
    line-height: ${EVENT_PILL_LABEL_LINE_HEIGHT}px;
    color: ${textColor};
    text-align: center;
    white-space: nowrap;
  `;

  const renderLabelText = () => (
    <span css={labelTextCss} data-test-subj={GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID}>
      {text}
    </span>
  );

  return (
    <RelationshipNodeContainer data-test-subj={GRAPH_RELATIONSHIP_NODE_ID}>
      <EdgeThroughLine $color={edgeThroughColor} aria-hidden={true} />
      <PillShell>
        <PillColumn>
          <RelationshipPill
            data-test-subj={GRAPH_RELATIONSHIP_NODE_SHAPE_ID}
            backgroundColor={backgroundColor}
            boxShadowCss={pillBoxShadow}
            hoverShadowCss={pillBoxShadow}
          >
            {renderLabelText()}
            <RelationshipTypeBadge count={isGroup ? count : undefined} />
          </RelationshipPill>
          {isGroup && (
            <GroupStack
              data-test-subj={TEST_SUBJ_RELATIONSHIP_GROUP_STACK}
              $borderColor={euiTheme.colors.borderBasePrimary}
              $fillColor={euiTheme.colors.backgroundLightPrimary}
              aria-hidden={true}
            />
          )}
        </PillColumn>

        {interactive && showExpandButton && (
          <EventHoverActionsToolbar
            onRelatedEventsClick={relatedEventsClickHandler}
            relatedEventsActive={relatedEventsActive}
            onExpandClick={(e, unToggleCallback) =>
              expandButtonClick?.(e, props, unToggleCallback)
            }
          />
        )}
      </PillShell>

      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={pillHandleStyle}
      />
      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={pillHandleStyle}
      />
    </RelationshipNodeContainer>
  );
});

RelationshipNode.displayName = 'RelationshipNode';
