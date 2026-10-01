/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import {
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID,
} from '../../../test_ids';
import type { EntityOrEventItem, EntityItem, EventItem, AlertItem } from '../types';
import { displayEntityName, displayEventName } from '../utils';
import { EntityActionsButton } from './entity_actions_button';
import { EventActionsButton } from './event_actions_button';
import { isInitialEntityForScope } from '../../../../filters/filter_store';
import { getSpanIcon } from '../../../../node/get_span_icon';

const entityUnavailableTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.entityUnavailable.tooltip',
  {
    defaultMessage: 'Entity unavailable in entity store',
  }
);

const openEntityDetailsLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.openEntityDetails.ariaLabel',
  {
    defaultMessage: 'Open entity details',
  }
);

const getRiskBadgeColors = (
  score: number,
  colors: {
    backgroundLightDanger: string;
    backgroundLightRisk: string;
    backgroundLightWarning: string;
    backgroundLightNeutral: string;
    backgroundLightPrimary: string;
    textDanger: string;
    textRisk: string;
    textWarning: string;
    textNeutral: string;
    textParagraph: string;
  }
) => {
  if (score >= 90) {
    return { background: colors.backgroundLightDanger, color: colors.textDanger };
  }
  if (score >= 70) {
    return { background: colors.backgroundLightRisk, color: colors.textRisk };
  }
  if (score >= 40) {
    return { background: colors.backgroundLightWarning, color: colors.textWarning };
  }
  if (score >= 20) {
    return { background: colors.backgroundLightNeutral, color: colors.textNeutral };
  }
  return { background: colors.backgroundLightPrimary, color: colors.textParagraph };
};

export interface HeaderRowProps {
  item: EntityOrEventItem;
  /**
   * Unique identifier for the graph instance, used to scope filter state.
   */
  scopeId: string;
  /** Invoked to open the event/alert details preview for a clicked item. */
  onShowDocument: (docId: string, indexName?: string, isEvent?: boolean) => void;
  /** Invoked to open the entity details preview for a clicked item. */
  onShowEntity: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
}

export const HeaderRow = ({ item, scopeId, onShowDocument, onShowEntity }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();

  const title = useMemo(() => {
    switch (item.itemType) {
      case DOCUMENT_TYPE_EVENT:
      case DOCUMENT_TYPE_ALERT:
        return displayEventName(item);
      case DOCUMENT_TYPE_ENTITY:
        return displayEntityName(item);
      default:
        return '-';
    }
  }, [item]);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (item.itemType === DOCUMENT_TYPE_ENTITY) {
        const entityItem = item as EntityItem;
        onShowEntity({
          engineType: entityItem.entity.engine_type,
          entityId: entityItem.id,
          entityName: entityItem.entity.name ?? entityItem.label,
        });
      } else {
        // event or alert
        const eventOrAlertItem = item as EventItem | AlertItem;
        if (eventOrAlertItem.docId) {
          onShowDocument(
            eventOrAlertItem.docId,
            eventOrAlertItem.index,
            eventOrAlertItem.itemType === DOCUMENT_TYPE_EVENT
          );
        }
      }
    },
    [item, onShowDocument, onShowEntity]
  );

  const isEntity = item.itemType === DOCUMENT_TYPE_ENTITY;
  const entityItem = isEntity ? (item as EntityItem) : undefined;
  const isClickable =
    item.itemType === DOCUMENT_TYPE_EVENT ||
    item.itemType === DOCUMENT_TYPE_ALERT ||
    (isEntity && !!entityItem?.entity?.availableInEntityStore);

  const entityTypeLabel = entityItem?.entity?.type;
  const riskScore = entityItem?.risk;
  const riskColors =
    riskScore !== undefined
      ? getRiskBadgeColors(riskScore, euiTheme.colors)
      : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {isEntity && entityItem && (
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${euiTheme.size.xl};
              height: ${euiTheme.size.xl};
              border-radius: ${euiTheme.border.radius.medium};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              flex-shrink: 0;
            `}
          >
            <EuiIcon
              type={getSpanIcon(entityItem.icon) ?? entityItem.icon ?? 'storage'}
              size="m"
              color="text"
              aria-hidden={true}
            />
          </div>
        </EuiFlexItem>
      )}
      {item.itemType === DOCUMENT_TYPE_ALERT && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFill" size="m" color="danger" aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
          overflow: hidden;
        `}
      >
        {isClickable ? (
          <EuiLink
            onClick={handlePreviewClick}
            color="text"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              display: block;
            `}
            data-test-subj={GROUPED_ITEM_TITLE_TEST_ID_LINK}
          >
            <EuiTextTruncate text={title} truncation="middle" />
            {entityTypeLabel && (
              <EuiText size="xs" color="subdued">
                {entityTypeLabel}
              </EuiText>
            )}
          </EuiLink>
        ) : (
          <EuiToolTip
            content={entityUnavailableTooltip}
            position="left"
            data-test-subj={GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID}
          >
            <EuiText
              size="s"
              color="text"
              tabIndex={0}
              data-test-subj={GROUPED_ITEM_TITLE_TEST_ID_TEXT}
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              <EuiTextTruncate text={title} truncation="middle" />
              {entityTypeLabel && (
                <EuiText size="xs" color="subdued">
                  {entityTypeLabel}
                </EuiText>
              )}
            </EuiText>
          </EuiToolTip>
        )}
      </EuiFlexItem>
      {riskScore !== undefined && riskColors && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            css={css`
              background-color: ${riskColors.background};
              color: ${riskColors.color};
              border: none;
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {riskScore.toFixed(2)}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {isEntity && entityItem ? (
          isClickable ? (
            <EuiLink
              onClick={handlePreviewClick}
              aria-label={openEntityDetailsLabel}
              color="text"
              data-test-subj="grouped-item-open-entity-chevron"
            >
              <EuiIcon type="arrowRight" />
            </EuiLink>
          ) : (
            <EntityActionsButton
              item={entityItem}
              scopeId={scopeId}
              isInitialEntity={isInitialEntityForScope(scopeId, entityItem.id)}
              onShowEntity={onShowEntity}
            />
          )
        ) : (
          <EventActionsButton
            item={item as EventItem | AlertItem}
            scopeId={scopeId}
            onShowDocument={onShowDocument}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
