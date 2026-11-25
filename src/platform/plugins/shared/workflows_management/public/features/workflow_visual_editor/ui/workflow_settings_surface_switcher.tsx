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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiRadio,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getWorkflowSettingsSurfaceVariant,
  setWorkflowSettingsSurfaceVariant,
  subscribeWorkflowSettingsSurfaceVariant,
  type WorkflowSettingsSurfaceVariant,
} from './workflow_settings_surface_variant';

function OptionLabel({ title, description }: { title: string; description: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    <span>
      <span css={{ fontWeight: euiTheme.font.weight.bold }}>{title}</span>
      <span css={{ fontWeight: euiTheme.font.weight.regular }}>{` · ${description}`}</span>
    </span>
  );
}

const SettingsSurfacePrototypeNavControl = () => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<WorkflowSettingsSurfaceVariant>(() =>
    getWorkflowSettingsSurfaceVariant()
  );
  const titleId = useGeneratedHtmlId({ prefix: 'workflowSettingsSurfacePrototype' });
  const radioAId = useGeneratedHtmlId({ prefix: 'settingsSurfaceOptionA' });
  const radioBId = useGeneratedHtmlId({ prefix: 'settingsSurfaceOptionB' });
  const radioCId = useGeneratedHtmlId({ prefix: 'settingsSurfaceOptionC' });
  const radioDId = useGeneratedHtmlId({ prefix: 'settingsSurfaceOptionD' });
  const radioEId = useGeneratedHtmlId({ prefix: 'settingsSurfaceOptionE' });

  useEffect(
    () =>
      subscribeWorkflowSettingsSurfaceVariant(() => {
        setValue(getWorkflowSettingsSurfaceVariant());
      }),
    []
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <EuiButton
        size="s"
        iconType="controls"
        onClick={open}
        data-test-subj="workflowSettingsSurfaceSwitcherButton"
      >
        {i18n.translate('workflows.settingsSurface.switcher.button', {
          defaultMessage: 'Prototype',
        })}
      </EuiButton>
      {isOpen ? (
        <EuiFlyout
          type="push"
          size="s"
          maxWidth={false}
          style={{ width: 440 }}
          onClose={close}
          aria-labelledby={titleId}
          data-test-subj="workflowSettingsSurfaceSwitcher"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={titleId}>
                <FormattedMessage
                  id="workflows.settingsSurface.switcher.flyoutTitle"
                  defaultMessage="Prototype · Settings"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <div
              role="radiogroup"
              aria-label={i18n.translate('workflows.settingsSurface.switcher.legend', {
                defaultMessage: 'Options',
              })}
              data-test-subj="workflowSettingsSurfaceSwitcherOptions"
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: euiTheme.size.m,
              }}
            >
              <EuiRadio
                id={radioAId}
                checked={value === 'b'}
                onChange={() => setWorkflowSettingsSurfaceVariant('b')}
                label={
                  <OptionLabel
                    title={i18n.translate('workflows.settingsSurface.switcher.optionATitle', {
                      defaultMessage: 'Option A',
                    })}
                    description={i18n.translate(
                      'workflows.settingsSurface.switcher.optionADescription',
                      { defaultMessage: 'Settings in the canvas' }
                    )}
                  />
                }
                data-test-subj="workflowSettingsSurfaceOptionA"
              />
              <EuiRadio
                id={radioBId}
                checked={value === 'card'}
                onChange={() => setWorkflowSettingsSurfaceVariant('card')}
                label={
                  <OptionLabel
                    title={i18n.translate('workflows.settingsSurface.switcher.optionBTitle', {
                      defaultMessage: 'Option B',
                    })}
                    description={i18n.translate(
                      'workflows.settingsSurface.switcher.optionBDescription',
                      { defaultMessage: 'Information in the canvas and settings button' }
                    )}
                  />
                }
                data-test-subj="workflowSettingsSurfaceOptionB"
              />
              <EuiRadio
                id={radioCId}
                checked={value === 'a'}
                onChange={() => setWorkflowSettingsSurfaceVariant('a')}
                label={
                  <OptionLabel
                    title={i18n.translate('workflows.settingsSurface.switcher.optionCTitle', {
                      defaultMessage: 'Option C',
                    })}
                    description={i18n.translate(
                      'workflows.settingsSurface.switcher.optionCDescription',
                      { defaultMessage: 'Information in the canvas and settings button' }
                    )}
                  />
                }
                data-test-subj="workflowSettingsSurfaceOptionC"
              />
              <EuiRadio
                id={radioDId}
                checked={value === 'd'}
                onChange={() => setWorkflowSettingsSurfaceVariant('d')}
                label={
                  <OptionLabel
                    title={i18n.translate('workflows.settingsSurface.switcher.optionDTitle', {
                      defaultMessage: 'Option D',
                    })}
                    description={i18n.translate(
                      'workflows.settingsSurface.switcher.optionDDescription',
                      { defaultMessage: 'Duplication' }
                    )}
                  />
                }
                data-test-subj="workflowSettingsSurfaceOptionD"
              />
              <EuiRadio
                id={radioEId}
                checked={value === 'e'}
                onChange={() => setWorkflowSettingsSurfaceVariant('e')}
                label={
                  <OptionLabel
                    title={i18n.translate('workflows.settingsSurface.switcher.optionETitle', {
                      defaultMessage: 'Option E',
                    })}
                    description={i18n.translate(
                      'workflows.settingsSurface.switcher.optionEDescription',
                      { defaultMessage: 'Settings in the canvas' }
                    )}
                  />
                }
                data-test-subj="workflowSettingsSurfaceOptionE"
              />
            </div>
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </>
  );
};

export interface WorkflowSettingsSurfaceSwitcherProps {
  readonly value: WorkflowSettingsSurfaceVariant;
  readonly onChange: (next: WorkflowSettingsSurfaceVariant) => void;
}

/**
 * Prototype-only control: mounts a Prototype button in the global header
 * (after the profile menu) that opens a push flyout with the options.
 */
export function WorkflowSettingsSurfaceSwitcher(_props: WorkflowSettingsSurfaceSwitcherProps) {
  const { chrome } = useKibana().services;

  useEffect(() => {
    chrome.controls.appendRight.set(<SettingsSurfacePrototypeNavControl />);
    return () => {
      chrome.controls.appendRight.set(undefined);
    };
  }, [chrome]);

  return null;
}
