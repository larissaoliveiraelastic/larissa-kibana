/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { GRAPH_PANEL_INSET } from '../constants';

/** Figma floating panel corner radius (Keyboard shortcuts / Display / Search). */
const FLOATING_PANEL_BORDER_RADIUS = 16;

const closeButtonLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.floatingPanel.close',
  { defaultMessage: 'Close' }
);

export interface GraphTopLeftFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Bottom-bar control that toggles this panel (excluded from outside-click dismiss). */
  children: React.ReactElement;
  /** Visible panel title (rendered in a real header — not EuiPopoverTitle). */
  title: string;
  titleId?: string;
  /** Panel body content below the header. */
  body: React.ReactNode;
  /**
   * `divided` — header + bottom border + separate body scroll (Display / Search).
   * `stacked` — single 16px padding; header→body gap is larger than list row gap
   * (Keyboard shortcuts: 24px header, 16px between rows).
   */
  layout?: 'divided' | 'stacked';
  /** Optional fixed width for stacked panels (Figma shortcuts = 290). */
  width?: number;
  'aria-label'?: string;
  'data-test-subj'?: string;
}

/**
 * Floating panel fixed to the top-left of the React Flow canvas with the same
 * {@link GRAPH_PANEL_INSET} (16px) used by zoom / bottom bar / minimap chrome.
 */
export const GraphTopLeftFloatingPanel = ({
  isOpen,
  onClose,
  children,
  title,
  titleId,
  body,
  layout = 'divided',
  width,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: GraphTopLeftFloatingPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const panelShadow = useEuiShadow('m');
  const buttonWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  const isStacked = layout === 'stacked';

  useEffect(() => {
    if (!isOpen) {
      setHost(null);
      return;
    }
    const reactFlow = buttonWrapRef.current?.closest('.react-flow');
    setHost(reactFlow ?? null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (panelRef.current?.contains(target) || buttonWrapRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    // Capture phase: React Flow stops bubble on the canvas, so outside-click
    // dismiss must run before the event is cancelled.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isOpen, onClose]);

  const panelCss = css`
    position: absolute;
    top: ${GRAPH_PANEL_INSET}px;
    left: ${GRAPH_PANEL_INSET}px;
    z-index: ${euiTheme.levels.menu};
    display: flex;
    flex-direction: column;
    ${isStacked
      ? `
      padding: ${GRAPH_PANEL_INSET}px;
      box-sizing: border-box;
      ${width != null ? `width: ${width}px;` : ''}
    `
      : ''}
    max-height: calc(100% - ${GRAPH_PANEL_INSET * 2}px);
    max-width: calc(100% - ${GRAPH_PANEL_INSET * 2}px);
    border: ${euiTheme.border.thin};
    border-radius: ${FLOATING_PANEL_BORDER_RADIUS}px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    overflow: hidden;
    pointer-events: auto;
    ${panelShadow};
  `;

  /**
   * FocusTrap wraps header+body as one child of the panel, so panel `gap` never
   * separated them. Put the column + gap on this inner shell instead.
   * Stacked: 24px header→body (one step above the 16px list row gap).
   */
  const panelInnerCss = css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    ${isStacked ? `gap: ${euiTheme.size.l};` : ''}
  `;

  const headerCss = css`
    flex-shrink: 0;
    ${isStacked
      ? ''
      : `
      padding: ${euiTheme.size.m};
      border-bottom: ${euiTheme.border.thin};
    `}
  `;

  const bodyCss = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  `;

  return (
    <>
      <div
        ref={buttonWrapRef}
        css={css`
          display: inline-flex;
        `}
      >
        {children}
      </div>
      {isOpen &&
        host &&
        createPortal(
          <div
            ref={panelRef}
            css={panelCss}
            role="dialog"
            aria-modal="false"
            aria-label={ariaLabel ?? title}
            aria-labelledby={titleId}
            data-test-subj={dataTestSubj}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <EuiFocusTrap clickOutsideDisables={true} returnFocus={false}>
              <div css={panelInnerCss}>
                <div css={headerCss}>
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={true}>
                      <EuiTitle size="xs">
                        <h4 id={titleId}>{title}</h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="cross"
                        aria-label={closeButtonLabel}
                        color="text"
                        size="xs"
                        onClick={onClose}
                        data-test-subj="graphFloatingPanelClose"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <div css={bodyCss}>{body}</div>
              </div>
            </EuiFocusTrap>
          </div>,
          host
        )}
    </>
  );
};
