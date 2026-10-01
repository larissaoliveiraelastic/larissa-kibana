/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty, useEuiTheme, type IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DocumentAnalysisOutput } from './analyze_documents';
import { EVENT_TYPE_BADGE_HEIGHT, EVENT_TYPE_BADGE_ICON_SIZE, EVENT_TYPE_BADGE_WIDTH } from './event_pill_styles';
import cubeIcon from '../../../assets/icons/cube.svg';

export const TEST_SUBJ_ALERT_ICON = 'label-node-alert-icon';
export const TEST_SUBJ_ALERT_COUNT = 'label-node-alert-count';
export const TEST_SUBJ_ALERT_COUNT_BUTTON = 'label-node-alert-count-button';
export const TEST_SUBJ_EVENT_ICON = 'label-node-event-icon';
export const TEST_SUBJ_EVENT_COUNT = 'label-node-event-count';
export const TEST_SUBJ_EVENT_COUNT_BUTTON = 'label-node-event-count-button';
export const TEST_SUBJ_RELATIONSHIP_ICON = 'label-node-relationship-icon';
export const TEST_SUBJ_RELATIONSHIP_COUNT = 'label-node-relationship-count';

/** Figma overflow — counts above this render as `+99`. */
export const LIMIT = 99;
export const displayCount = (count: number) => (count > LIMIT ? `+${LIMIT}` : String(count));

/** Figma Event badge icons (14px glyph inside 28×20 chip). */
export const EVENT_TYPE_ICON: IconType = cubeIcon;
export const ALERT_TYPE_ICON: IconType = 'warningFilled';
export const RELATIONSHIP_TYPE_ICON: IconType = 'cluster';

const POPOVER_EVENT_ARIA_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.labelBadges.eventAriaLabel',
  {
    defaultMessage: 'Show event details',
  }
);

const POPOVER_ALERT_ARIA_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.labelBadges.alertAriaLabel',
  {
    defaultMessage: 'Show alert details',
  }
);

interface LabelNodeBadgesProps {
  analysis: DocumentAnalysisOutput;
  /** Kept for API compatibility — Figma badges stay light across Active. */
  isActive?: boolean;
  onEventClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const stopPropagation = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

type TypeBadgeVariant = 'alert' | 'event' | 'relationship';

const useTypeBadgeCss = (variant: TypeBadgeVariant) => {
  const { euiTheme } = useEuiTheme();
  const isAlert = variant === 'alert';
  // Pill is Light/Primary — all type badges sit on Base/Plain (white);
  // Alert keeps danger text/icon for recognition.
  return css`
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 2px;
    box-sizing: border-box;
    height: ${EVENT_TYPE_BADGE_HEIGHT}px;
    min-height: ${EVENT_TYPE_BADGE_HEIGHT}px;
    min-width: ${EVENT_TYPE_BADGE_WIDTH}px;
    width: fit-content;
    padding: 0 8px;
    border: none;
    border-radius: 999px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    color: ${isAlert ? euiTheme.colors.textDanger : euiTheme.colors.textParagraph};
    font-weight: ${euiTheme.font.weight.medium};
    font-size: 12px;
    line-height: ${EVENT_TYPE_BADGE_HEIGHT}px;

    .euiBadge__icon {
      width: ${EVENT_TYPE_BADGE_ICON_SIZE}px !important;
      height: ${EVENT_TYPE_BADGE_ICON_SIZE}px !important;
      min-width: ${EVENT_TYPE_BADGE_ICON_SIZE}px;
      margin-inline-end: 0;
      flex-shrink: 0;
    }

    .euiBadge__content {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
  `;
};

const TypeBadge = ({
  variant,
  iconType,
  count,
  iconTestSubj,
  countTestSubj,
  ariaLabel,
}: {
  variant: TypeBadgeVariant;
  iconType: IconType;
  count?: number;
  iconTestSubj: string;
  countTestSubj?: string;
  ariaLabel?: string;
}) => {
  const badgeCss = useTypeBadgeCss(variant);
  const hasCount = count !== undefined;

  const badge = (
    <EuiBadge
      color="hollow"
      iconType={iconType}
      iconSide="left"
      data-test-subj={hasCount ? countTestSubj : iconTestSubj}
      aria-label={ariaLabel}
      css={badgeCss}
    >
      {hasCount ? displayCount(count) : null}
    </EuiBadge>
  );

  // Group badges expose both icon + count test subjects (legacy contract).
  if (hasCount) {
    return <span data-test-subj={iconTestSubj}>{badge}</span>;
  }

  return badge;
};

const ClickableBadge = ({
  onEventClick,
  buttonTestSubj,
  ariaLabel,
  children,
}: {
  onEventClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  buttonTestSubj: string;
  ariaLabel: string;
  children: React.ReactNode;
}) => {
  if (!onEventClick) {
    return <>{children}</>;
  }

  return (
    <EuiButtonEmpty
      size="xs"
      color="text"
      flush="both"
      data-test-subj={buttonTestSubj}
      onClick={(e) => {
        stopPropagation(e);
        onEventClick(e);
      }}
      aria-label={ariaLabel}
      css={css`
        height: auto;
        min-height: 0;
        padding: 0;
      `}
    >
      {children}
    </EuiButtonEmpty>
  );
};

/**
 * Figma Event badges (14980:17219):
 * - Alert → warningFilled on white (danger icon/text; icon only for Single; +count for Group)
 * - Event → cube on white
 * - Relationship → cluster on white
 */
export const LabelNodeBadges = ({ analysis, onEventClick }: LabelNodeBadgesProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
    >
      {analysis.isSingleEvent && (
        <TypeBadge
          variant="event"
          iconType={EVENT_TYPE_ICON}
          iconTestSubj={TEST_SUBJ_EVENT_ICON}
          ariaLabel={POPOVER_EVENT_ARIA_LABEL}
        />
      )}
      {analysis.isSingleAlert && (
        <TypeBadge
          variant="alert"
          iconType={ALERT_TYPE_ICON}
          iconTestSubj={TEST_SUBJ_ALERT_ICON}
          ariaLabel={POPOVER_ALERT_ARIA_LABEL}
        />
      )}
      {analysis.isGroupOfEvents && (
        <ClickableBadge
          onEventClick={onEventClick}
          buttonTestSubj={TEST_SUBJ_EVENT_COUNT_BUTTON}
          ariaLabel={POPOVER_EVENT_ARIA_LABEL}
        >
          <TypeBadge
            variant="event"
            iconType={EVENT_TYPE_ICON}
            count={analysis.uniqueEventsCount}
            iconTestSubj={TEST_SUBJ_EVENT_ICON}
            countTestSubj={TEST_SUBJ_EVENT_COUNT}
          />
        </ClickableBadge>
      )}
      {analysis.isGroupOfAlerts && (
        <ClickableBadge
          onEventClick={onEventClick}
          buttonTestSubj={TEST_SUBJ_ALERT_COUNT_BUTTON}
          ariaLabel={POPOVER_ALERT_ARIA_LABEL}
        >
          <TypeBadge
            variant="alert"
            iconType={ALERT_TYPE_ICON}
            count={analysis.uniqueAlertsCount}
            iconTestSubj={TEST_SUBJ_ALERT_ICON}
            countTestSubj={TEST_SUBJ_ALERT_COUNT}
          />
        </ClickableBadge>
      )}
      {analysis.isGroupOfEventsAndAlerts && (
        <>
          <ClickableBadge
            onEventClick={onEventClick}
            buttonTestSubj={TEST_SUBJ_EVENT_COUNT_BUTTON}
            ariaLabel={POPOVER_EVENT_ARIA_LABEL}
          >
            <TypeBadge
              variant="event"
              iconType={EVENT_TYPE_ICON}
              count={analysis.uniqueEventsCount}
              iconTestSubj={TEST_SUBJ_EVENT_ICON}
              countTestSubj={TEST_SUBJ_EVENT_COUNT}
            />
          </ClickableBadge>
          <ClickableBadge
            onEventClick={onEventClick}
            buttonTestSubj={TEST_SUBJ_ALERT_COUNT_BUTTON}
            ariaLabel={POPOVER_ALERT_ARIA_LABEL}
          >
            <TypeBadge
              variant="alert"
              iconType={ALERT_TYPE_ICON}
              count={analysis.uniqueAlertsCount}
              iconTestSubj={TEST_SUBJ_ALERT_ICON}
              countTestSubj={TEST_SUBJ_ALERT_COUNT}
            />
          </ClickableBadge>
        </>
      )}
    </div>
  );
};

/** Standalone relationship type badge (single or group). */
export const RelationshipTypeBadge = ({ count }: { count?: number }) => (
  <TypeBadge
    variant="relationship"
    iconType={RELATIONSHIP_TYPE_ICON}
    count={count}
    iconTestSubj={TEST_SUBJ_RELATIONSHIP_ICON}
    countTestSubj={count !== undefined ? TEST_SUBJ_RELATIONSHIP_COUNT : undefined}
  />
);
