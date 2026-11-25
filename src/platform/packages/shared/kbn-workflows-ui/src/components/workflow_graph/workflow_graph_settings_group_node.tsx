/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, transparentize, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  DATA_GROUP_HEADER_HEIGHT,
  SETTINGS_GROUP_HEADER_HEIGHT,
  SETTINGS_GROUP_PAD,
} from './build_settings_nodes';

export interface WorkflowGraphSettingsGroupNodeData extends Record<string, unknown> {
  /** True when one of the settings cards inside is selected. */
  readonly hasSelection?: boolean;
  /** Option E names the group Workflow data. Other canvas options keep Workflow settings. */
  readonly title?: 'settings' | 'data';
}

/**
 * Non-interactive backdrop that groups the Workflow info / Constants /
 * Outputs cards above the trigger rank.
 */
function WorkflowGraphSettingsGroupNodeInner(
  node: NodeProps<Node<WorkflowGraphSettingsGroupNodeData>>
) {
  const { hasSelection, title } = node.data;
  const { euiTheme } = useEuiTheme();
  const isData = title === 'data';
  const borderRadius = isData
    ? (euiTheme.border.radius.medium ?? 6)
    : (euiTheme.border.radius.small ?? 4);
  const headerHeight = isData ? DATA_GROUP_HEADER_HEIGHT : SETTINGS_GROUP_HEADER_HEIGHT;

  return (
    <div
      aria-hidden={true}
      data-test-subj="workflowGraphSettingsGroup"
      css={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: isData
          ? euiTheme.colors.backgroundBasePlain
          : transparentize(euiTheme.colors.backgroundBasePlain, 0.45),
        border: `${euiTheme.border.width.thin} solid ${
          hasSelection ? euiTheme.colors.primary : euiTheme.colors.borderBaseSubdued
        }`,
        borderRadius,
        pointerEvents: 'none',
        transition: 'border-color 120ms ease',
        paddingTop: SETTINGS_GROUP_PAD,
        paddingInline: SETTINGS_GROUP_PAD,
      }}
    >
      <div
        css={{
          height: headerHeight,
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          fontFamily: euiTheme.font.family,
          fontSize: 12,
          fontWeight: euiTheme.font.weight.medium,
          lineHeight: `${SETTINGS_GROUP_HEADER_HEIGHT}px`,
          color: euiTheme.colors.textSubdued,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {isData ? <EuiIcon type="workflow" size="m" color="subdued" aria-hidden={true} /> : null}
        {isData
          ? i18n.translate('workflowsUi.graph.settings.groupTitleData', {
              defaultMessage: 'Workflow data',
            })
          : i18n.translate('workflowsUi.graph.settings.groupTitle', {
              defaultMessage: 'Workflow settings',
            })}
      </div>
    </div>
  );
}

export const WorkflowGraphSettingsGroupNode = memo(WorkflowGraphSettingsGroupNodeInner);
