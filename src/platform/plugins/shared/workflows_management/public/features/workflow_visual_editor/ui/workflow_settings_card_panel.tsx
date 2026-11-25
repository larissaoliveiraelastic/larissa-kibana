/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useWorkflowSettingsDraft } from './use_workflow_settings_draft';

export type WorkflowSettingsCardPanelMode = 'description';

export interface WorkflowSettingsCardPanelProps {
  readonly readOnly?: boolean;
  readonly onClose: () => void;
}

/**
 * Use case B description body, mounted in the same {@link CanvasConfigPanelShell}
 * as a step. Constants and outputs reuse {@link WorkflowSettingsBPanel}.
 */
export function WorkflowSettingsCardPanel({
  readOnly = false,
  onClose,
}: WorkflowSettingsCardPanelProps) {
  const draft = useWorkflowSettingsDraft({ hydrateKey: 'description', readOnly });
  const title = i18n.translate('workflows.settingsSurface.card.descriptionTitle', {
    defaultMessage: 'Description',
  });
  const closeLabel = i18n.translate('workflows.settingsSurface.b.close', {
    defaultMessage: 'Close',
  });

  const handleDescriptionBlur = useCallback(() => {
    draft.applyYamlPatch({ description: draft.description.trim() });
  }, [draft]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      style={{ height: '100%', minHeight: 0 }}
      data-test-subj="workflowSettingsCardPanel-description"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={closeLabel}
              onClick={onClose}
              data-test-subj="workflowSettingsCardPanelClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: 0, overflow: 'auto' }}>
        <EuiFormRow
          fullWidth
          label={i18n.translate('workflows.workflowSettingsFlyout.descriptionLabel', {
            defaultMessage: 'Description',
          })}
        >
          <EuiTextArea
            fullWidth
            rows={8}
            value={draft.description}
            disabled={readOnly}
            onChange={(event) => draft.setDescription(event.target.value)}
            onBlur={handleDescriptionBlur}
            data-test-subj="workflowSettingsCardDescriptionInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="workflowSettingsCardPanelCancel">
              {i18n.translate('workflows.settingsSurface.b.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose} data-test-subj="workflowSettingsCardPanelDone">
              {i18n.translate('workflows.settingsSurface.b.done', { defaultMessage: 'Done' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
