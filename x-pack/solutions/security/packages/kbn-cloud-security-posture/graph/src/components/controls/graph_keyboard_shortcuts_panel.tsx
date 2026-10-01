/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  CENTER_SHORTCUT,
  DISPLAY_SHORTCUT,
  FIT_TO_SCREEN_SHORTCUT,
  FULL_SCREEN_SHORTCUT,
  SEARCH_TOOL_SHORTCUT,
  ZOOM_IN_SHORTCUT,
  ZOOM_OUT_SHORTCUT,
} from './graph_keyboard_shortcuts';
import { GraphTopLeftFloatingPanel } from './graph_top_left_floating_panel';

/** Figma View Controls — Keyboard shortcuts frame width. */
const SHORTCUTS_PANEL_WIDTH = 290;
/** Figma EuiBadge hollow key chip. */
const KEY_BADGE_HEIGHT = 20;
const KEY_BADGE_MIN_WIDTH = 28;
const KEY_BADGE_PADDING_X = 8;
const KEY_BADGE_RADIUS = 20;

const panelTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.title',
  { defaultMessage: 'Keyboard shortcuts' }
);

const shortcuts = [
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.search', {
      defaultMessage: 'Open search',
    }),
    keys: [SEARCH_TOOL_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.display', {
      defaultMessage: 'Display options',
    }),
    keys: [DISPLAY_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.zoomIn', {
      defaultMessage: 'Zoom in',
    }),
    keys: [ZOOM_IN_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.zoomOut', {
      defaultMessage: 'Zoom out',
    }),
    keys: [ZOOM_OUT_SHORTCUT],
  },
  {
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.fitToScreen',
      { defaultMessage: 'Fit to screen' }
    ),
    keys: [FIT_TO_SCREEN_SHORTCUT],
  },
  {
    label: i18n.translate('securitySolutionPackages.csp.graph.controls.keyboardShortcuts.center', {
      defaultMessage: 'Center graph',
    }),
    keys: [CENTER_SHORTCUT],
  },
  {
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.controls.keyboardShortcuts.fullScreen',
      { defaultMessage: 'Full screen' }
    ),
    keys: [FULL_SCREEN_SHORTCUT],
  },
];

export interface GraphKeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactElement;
}

export const GraphKeyboardShortcutsPanel = ({
  isOpen,
  onClose,
  children,
}: GraphKeyboardShortcutsPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();

  const labelCss = useMemo(
    () => css`
      color: ${euiTheme.colors.textParagraph};
    `,
    [euiTheme]
  );

  const badgeCss = useMemo(
    () => css`
      /* Figma: EuiBadge hollow — 28×20, radius 20, pad 8 / 0 */
      height: ${KEY_BADGE_HEIGHT}px;
      min-width: ${KEY_BADGE_MIN_WIDTH}px;
      padding: 0 ${KEY_BADGE_PADDING_X}px !important;
      border-radius: ${KEY_BADGE_RADIUS}px !important;
      line-height: ${KEY_BADGE_HEIGHT}px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: ${euiTheme.font.weight.medium};
    `,
    [euiTheme]
  );

  const listCss = useMemo(
    () => css`
      /* 16px between rows; header→list uses 24px on the stacked floating panel. */
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.base};
    `,
    [euiTheme]
  );

  return (
    <GraphTopLeftFloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title={panelTitle}
      titleId={titleId}
      layout="stacked"
      width={SHORTCUTS_PANEL_WIDTH}
      data-test-subj="graphKeyboardShortcutsPanel"
      body={
        <div css={listCss}>
          {shortcuts.map(({ label, keys }) => (
            <EuiFlexGroup
              key={label}
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="m"
              responsive={false}
            >
              <EuiFlexItem grow={true}>
                <EuiText size="s" css={labelCss}>
                  {label}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                  {keys.map((key) => (
                    <EuiFlexItem key={key} grow={false}>
                      <EuiBadge color="hollow" css={badgeCss}>
                        {key}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </div>
      }
    >
      {children}
    </GraphTopLeftFloatingPanel>
  );
};
