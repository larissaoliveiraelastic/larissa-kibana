/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import cubeIcon from '../../assets/icons/cube.svg';
import { GRAPH_NODE_EXPAND_BUTTON_ID } from '../test_ids';
import { EVENT_PILL_HEIGHT } from './label_node/event_pill_styles';

/**
 * Figma Event action menu (14980:17219) — two empty icon buttons above the pill
 * on Hover / Active Hover only. Never the legacy blue `+` circle.
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2/-9.5--Graph-viz---Component-Library?node-id=14980-17219
 */
export const GRAPH_EVENT_HOVER_ACTIONS_TOOLBAR_ID = 'cloudSecurityGraphEventHoverActionsToolbar';
export const TEST_SUBJ_EVENT_HOVER_CUBE = 'event-hover-action-cube';
export const TEST_SUBJ_EVENT_HOVER_EXPAND = 'event-hover-action-expand';
/** Alias kept for label/relationship node tests that looked for the old expand control. */
export const TEST_SUBJ_PILL_EXPAND_BTN = TEST_SUBJ_EVENT_HOVER_EXPAND;

const showRelatedEventsLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.eventHover.showRelatedEvents',
  { defaultMessage: 'Show related events' }
);

const hideRelatedEventsLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.eventHover.hideRelatedEvents',
  { defaultMessage: 'Hide related events' }
);

const expandAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.eventHover.expandActions',
  { defaultMessage: 'Open or close node actions' }
);

export interface EventHoverActionsToolbarProps {
  /**
   * Cube — “Show related events” (same toggle as the label expand popover).
   * Always rendered; click is a no-op when undefined.
   */
  onRelatedEventsClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** When true, cube tooltip/aria reads “Hide related events”. */
  relatedEventsActive?: boolean;
  /** Expand — opens the label/relationship expand popover. */
  onExpandClick?: (
    e: React.MouseEvent<HTMLElement>,
    unToggleCallback: () => void
  ) => void;
}

export const EventHoverActionsToolbar = memo<EventHoverActionsToolbarProps>(
  ({ onRelatedEventsClick, relatedEventsActive = false, onExpandClick }) => {
    const { euiTheme } = useEuiTheme();
    const [isExpandToggled, setIsExpandToggled] = useState(false);

    const unToggleCallback = useCallback(() => {
      setIsExpandToggled(false);
    }, []);

    const onExpandHandler = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        setIsExpandToggled((curr) => !curr);
        onExpandClick?.(e, unToggleCallback);
      },
      [onExpandClick, unToggleCallback]
    );

    if (!onExpandClick && !onRelatedEventsClick) {
      return null;
    }

    const relatedEventsTooltip = relatedEventsActive
      ? hideRelatedEventsLabel
      : showRelatedEventsLabel;

    const iconButtonCss = css`
      &,
      &:disabled,
      &[disabled] {
        color: ${euiTheme.colors.textParagraph} !important;
        opacity: 1;
      }
      .euiIcon,
      .euiIcon svg {
        width: ${euiTheme.size.base};
        height: ${euiTheme.size.base};
        shape-rendering: geometricPrecision;
      }
    `;

    /* EuiToolTip needs a block/inline-flex wrapper so the portal can anchor
       to a real box — wrapping EuiButtonIcon alone often fails inside React Flow. */
    const tooltipAnchorCss = css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    return (
      <div
        data-test-subj={GRAPH_EVENT_HOVER_ACTIONS_TOOLBAR_ID}
        role="toolbar"
        aria-label={i18n.translate(
          'securitySolutionPackages.csp.graph.eventHover.toolbarAriaLabel',
          { defaultMessage: 'Event actions' }
        )}
        className={isExpandToggled ? 'toggled' : undefined}
        css={css`
          position: absolute;
          left: 50%;
          bottom: calc(100% + ${euiTheme.size.xs});
          height: ${euiTheme.size.xl};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${euiTheme.size.xs};
          z-index: 10;
          transform: translateX(-50%);
          /* Hover / Active Hover only — never on Active without hover (no blue +). */
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.14s ease-out;

          .react-flow__node:not(.non-interactive):hover:not(.dragging) &,
          &.toggled {
            opacity: 1;
            pointer-events: auto;
          }
        `}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EuiToolTip
          content={relatedEventsTooltip}
          position="top"
          delay="regular"
          disableScreenReaderOutput
        >
          <span css={tooltipAnchorCss}>
            <EuiButtonIcon
              iconType={cubeIcon}
              iconSize="m"
              aria-label={relatedEventsTooltip}
              data-test-subj={TEST_SUBJ_EVENT_HOVER_CUBE}
              color="text"
              display="empty"
              size="s"
              css={iconButtonCss}
              onClick={(e) => {
                e.stopPropagation();
                onRelatedEventsClick?.(e);
              }}
            />
          </span>
        </EuiToolTip>
        {onExpandClick && (
          <EuiToolTip
            content={expandAriaLabel}
            position="top"
            delay="regular"
            disableScreenReaderOutput
          >
            <span css={tooltipAnchorCss}>
              <EuiButtonIcon
                iconType="expand"
                iconSize="m"
                aria-label={expandAriaLabel}
                data-test-subj={TEST_SUBJ_EVENT_HOVER_EXPAND}
                color="text"
                display="empty"
                size="s"
                css={iconButtonCss}
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandHandler(e);
                }}
              />
            </span>
          </EuiToolTip>
        )}
        {/* Keep legacy expand id queryable for popover helpers / tests */}
        <span data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID} hidden aria-hidden={true} />
      </div>
    );
  }
);

EventHoverActionsToolbar.displayName = 'EventHoverActionsToolbar';

/** @deprecated Reserved height helper — toolbar floats above the pill. */
export const EVENT_HOVER_ACTIONS_RESERVE = EVENT_PILL_HEIGHT;
