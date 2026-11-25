/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiIcon, euiFocusRing, transparentize, useEuiShadow, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowSettingsNodeKind } from './workflow_graph_actions_context';

export interface SettingsDataRow {
  readonly name: string;
  readonly value: string;
}

const CHIP_SIZE = 28;
const VISIBLE_TAGS = 2;

function DataCardRows({
  rows,
  hasMore,
}: {
  readonly rows: readonly SettingsDataRow[];
  readonly hasMore: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: euiTheme.size.xs,
        minWidth: 0,
      }}
    >
      {rows.map((row) => (
        <div
          key={row.name}
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
            minWidth: 0,
          }}
        >
          <span
            css={{
              flex: '0 1 auto',
              maxWidth: '62%',
              minWidth: 0,
              padding: `2px ${euiTheme.size.s}`,
              borderRadius: euiTheme.border.radius.small,
              background: euiTheme.colors.backgroundBaseSubdued,
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              lineHeight: '16px',
              color: euiTheme.colors.textParagraph,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.name}
          >
            {row.name}
          </span>
          <span
            css={{
              flex: '1 1 auto',
              minWidth: 0,
              marginLeft: 'auto',
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              lineHeight: '16px',
              textAlign: 'right',
              color: euiTheme.colors.textSubdued,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.value}
          >
            {row.value}
          </span>
        </div>
      ))}
      {hasMore ? (
        <span
          aria-hidden={true}
          data-test-subj="workflowGraphSettingsMore"
          css={{
            alignSelf: 'flex-start',
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            lineHeight: '16px',
            letterSpacing: '1px',
            color: euiTheme.colors.textSubdued,
          }}
        >
          ...
        </span>
      ) : null}
    </div>
  );
}

/**
 * Option E card inside the Workflow data group.
 * Info shows the workflow name, one description line, and tags.
 * Constants and Outputs show a count and two rows.
 */
export function WorkflowGraphSettingsDataCard({
  kind,
  workflowName,
  description,
  tags,
  count,
  rows,
  isActive,
  onSelect,
}: {
  readonly kind: WorkflowSettingsNodeKind;
  readonly workflowName: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly count: number;
  readonly rows: readonly SettingsDataRow[];
  readonly isActive: boolean;
  readonly onSelect: () => void;
}) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const cardShadow = useEuiShadow('xs', { border: 'none' });
  const borderRadius = euiTheme.border.radius.medium ?? 6;
  const chipRadius = euiTheme.border.radius.small ?? 4;
  const visibleTags = tags.slice(0, VISIBLE_TAGS);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const name =
    workflowName.trim() ||
    i18n.translate('workflowsUi.graph.settings.cardFallbackName', {
      defaultMessage: 'Workflow',
    });
  const descriptionLine = description.replace(/\s+/g, ' ').trim();
  const title =
    kind === 'constants'
      ? i18n.translate('workflowsUi.graph.settings.constantsLabel', {
          defaultMessage: 'Constants',
        })
      : kind === 'outputs'
        ? i18n.translate('workflowsUi.graph.settings.outputsLabel', {
            defaultMessage: 'Outputs',
          })
        : name;
  const tone =
    kind === 'constants'
      ? {
          background: transparentize(euiTheme.colors.vis.euiColorVis2, 0.15),
          foreground: euiTheme.colors.vis.euiColorVis2,
        }
      : kind === 'outputs'
        ? {
            background: euiTheme.colors.backgroundLightSuccess,
            foreground: euiTheme.colors.success,
          }
        : {
            background: euiTheme.colors.backgroundLightPrimary,
            foreground: euiTheme.colors.primary,
          };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        kind === 'info' ? (descriptionLine ? `${name}. ${descriptionLine}` : name) : `${title}: ${count}`
      }
      data-test-subj={`workflowGraphSettingsNode-${kind}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      css={[
        {
          position: 'relative',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          background: euiTheme.colors.backgroundBasePlain,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius,
          padding: euiTheme.size.m,
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
          overflow: 'hidden',
          cursor: 'pointer',
          '&:focus': { outline: 'none' },
          '&:focus-visible': euiFocusRing(euiThemeContext),
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: isActive ? `0 0 0 2px ${euiTheme.colors.primary}` : 'none',
          },
        },
        cardShadow,
      ]}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          minWidth: 0,
        }}
      >
        <span
          css={{
            flex: '0 0 auto',
            width: CHIP_SIZE,
            height: CHIP_SIZE,
            borderRadius: chipRadius,
            background: tone.background,
            color: tone.foreground,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: euiTheme.font.weight.medium,
            lineHeight: 1,
          }}
        >
          {kind === 'constants' ? (
            '(x)'
          ) : (
            <EuiIcon
              type={kind === 'outputs' ? 'logstashOutput' : 'info'}
              size="m"
              color={tone.foreground}
              aria-hidden={true}
            />
          )}
        </span>
        <span
          css={{
            flex: '1 1 auto',
            minWidth: 0,
            fontFamily: euiTheme.font.family,
            fontSize: 14,
            fontWeight: euiTheme.font.weight.medium,
            lineHeight: '20px',
            color: euiTheme.colors.textHeading,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={kind === 'info' ? name : undefined}
        >
          {title}
        </span>
        {kind === 'info' ? null : (
          <span
            data-test-subj={`workflowGraphSettingsCount-${kind}`}
            css={{
              flex: '0 0 auto',
              minWidth: 20,
              padding: `0 ${euiTheme.size.xs}`,
              borderRadius: euiTheme.border.radius.small,
              background: euiTheme.colors.backgroundBaseSubdued,
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              fontWeight: euiTheme.font.weight.medium,
              lineHeight: '18px',
              textAlign: 'center',
              color: euiTheme.colors.textSubdued,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {kind === 'info' ? (
        <>
          <div
            css={{
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              fontWeight: euiTheme.font.weight.regular,
              lineHeight: '16px',
              color: euiTheme.colors.textSubdued,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={descriptionLine || undefined}
          >
            {descriptionLine}
          </div>
          {tags.length > 0 ? (
            <div
              css={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: euiTheme.size.xs,
                minWidth: 0,
                overflow: 'hidden',
              }}
              data-test-subj="workflowSettingsDataCardTags"
            >
              {visibleTags.map((tag) => (
                <EuiBadge key={tag} color="hollow">
                  {tag}
                </EuiBadge>
              ))}
              {hiddenTagCount > 0 ? <EuiBadge color="hollow">{`+${hiddenTagCount}`}</EuiBadge> : null}
            </div>
          ) : null}
        </>
      ) : (
        <DataCardRows rows={rows} hasMore={count > rows.length} />
      )}
    </div>
  );
}
