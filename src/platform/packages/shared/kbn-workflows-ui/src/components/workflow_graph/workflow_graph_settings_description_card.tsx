/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, useEuiShadow, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo, useLayoutEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface WorkflowGraphSettingsDescriptionCardData extends Record<string, unknown> {
  readonly workflowName: string;
  readonly description: string;
  readonly tags: readonly string[];
}

/** One row of tags. Tags that do not fit collapse into a single "..." badge. */
function DescriptionCardTags({ tags }: { readonly tags: readonly string[] }) {
  const { euiTheme } = useEuiTheme();
  const rowRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const moreLabel = i18n.translate('workflowsUi.graph.settings.moreTags', {
    defaultMessage: 'More tags',
  });

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const fit = () => {
      const items = Array.from(row.querySelectorAll<HTMLElement>('[data-tag-measure]'));
      const ellipsis = row.querySelector<HTMLElement>('[data-ellipsis-measure]');
      const styles = getComputedStyle(row);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const available = row.clientWidth;
      const ellipsisWidth = ellipsis?.offsetWidth ?? 0;
      let used = 0;
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        const width = items[i].offsetWidth;
        const gapBefore = count > 0 ? gap : 0;
        const moreAfter = i < items.length - 1;
        const reserve = moreAfter ? gap + ellipsisWidth : 0;
        if (used + gapBefore + width + reserve > available + 0.5) break;
        used += gapBefore + width;
        count += 1;
      }
      setVisibleCount((prev) => (prev === count ? prev : count));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [tags]);

  const hidden = tags.slice(visibleCount);

  return (
    <div
      ref={rowRef}
      css={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        marginTop: euiTheme.size.xs,
        minWidth: 0,
        overflow: 'hidden',
      }}
      data-test-subj="workflowSettingsDescriptionCardTags"
    >
      {tags.map((tag, index) => (
        <EuiBadge
          key={tag}
          color="hollow"
          data-tag-measure
          css={
            index >= visibleCount
              ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }
              : { flex: '0 0 auto' }
          }
        >
          {tag}
        </EuiBadge>
      ))}
      <EuiBadge
        color="hollow"
        data-ellipsis-measure
        aria-label={hidden.length > 0 ? moreLabel : undefined}
        title={hidden.length > 0 ? hidden.join(', ') : undefined}
        css={
          hidden.length > 0
            ? { flex: '0 0 auto' }
            : { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }
        }
      >
        ...
      </EuiBadge>
    </div>
  );
}

/**
 * Description card for use cases B, C, and D. The whole card opens the info
 * panel. Width stays the step-node width; name, description, and tags use the
 * full row.
 */
function WorkflowGraphSettingsDescriptionCardInner(
  node: NodeProps<Node<WorkflowGraphSettingsDescriptionCardData>>
) {
  const { workflowName, description, tags } = node.data;
  const { euiTheme } = useEuiTheme();
  const cardShadow = useEuiShadow('xs', { border: 'none' });
  const trimmed = description.replace(/\s+/g, ' ').trim();
  const name =
    workflowName.trim() ||
    i18n.translate('workflowsUi.graph.settings.cardFallbackName', {
      defaultMessage: 'Workflow',
    });
  const borderRadius = euiTheme.border.radius.small ?? 4;

  return (
    <div
      data-test-subj="workflowSettingsDescriptionCard"
      css={[
        {
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          background: euiTheme.colors.backgroundBasePlain,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius,
          padding: euiTheme.size.base,
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
          overflow: 'hidden',
          cursor: 'pointer',
        },
        cardShadow,
      ]}
    >
        <div
          css={{
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: euiTheme.size.s,
          }}
        >
          <div
            css={{
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '16px',
              color: euiTheme.colors.textHeading,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={name}
          >
            {name}
          </div>
          <div
            title={trimmed || undefined}
            css={{
              minWidth: 0,
              maxWidth: '100%',
              fontFamily: euiTheme.font.family,
              fontSize: 11,
              fontWeight: 400,
              lineHeight: '14px',
              color: euiTheme.colors.textSubdued,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: -4,
            }}
          >
            {trimmed ? (
              trimmed
            ) : (
              <FormattedMessage
                id="workflows.workflowList.noDescription"
                defaultMessage="No description"
              />
            )}
          </div>
          {tags.length > 0 ? <DescriptionCardTags tags={tags} /> : null}
        </div>
    </div>
  );
}

export const WorkflowGraphSettingsDescriptionCard = memo(
  WorkflowGraphSettingsDescriptionCardInner
);
