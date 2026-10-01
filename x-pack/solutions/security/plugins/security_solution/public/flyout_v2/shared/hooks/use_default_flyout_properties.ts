/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';

/**
 * Hook that returns the main properties used when opening a document flyout, to ensure consistency.
 * The minWidth and maxWidth values are mimicking what Discover is doing here `src/platform/plugins/shared/unified_doc_viewer/public/components/doc_viewer_flyout/doc_viewer_flyout.tsx`.
 *
 * minWidth is floored so the Entity Analytics Graph preview can keep two entity cards
 * wide enough for a risk badge like `98.72` without clipping when the flyout is resized.
 */
export const useDefaultDocumentFlyoutProperties = (): OverlaySystemFlyoutOpenOptions => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    // Graph preview floor so both cards keep "Hosts" + risk range visible:
    // 2× card min (~208) + trunk (72) + fan-out (28) + gaps/padding (~96) ≈ 612,
    // plus flyout chrome → ~640.
    const graphPreviewSafeMinWidth = euiTheme.base * 40;
    return {
      maxWidth: euiTheme.breakpoint.xl,
      minWidth: Math.max(euiTheme.base * 24, graphPreviewSafeMinWidth),
      ownFocus: false,
      paddingSize: 'm',
      resizable: true,
      size: 's',
    };
  }, [euiTheme.breakpoint.xl, euiTheme.base]);
};

/**
 * Hook that returns the main properties used when opening a tools flyout, to ensure consistency.
 */
export const defaultToolsFlyoutProperties: OverlaySystemFlyoutOpenOptions = {
  ownFocus: false,
  paddingSize: 'm',
  resizable: true,
  size: 'm',
};

/**
 * Entity Graph tool flyout — wider than other tools so the full graph (cards +
 * relationship corridor) fits without horizontal clipping.
 */
export const entityGraphToolsFlyoutProperties: OverlaySystemFlyoutOpenOptions = {
  ownFocus: false,
  paddingSize: 'm',
  resizable: true,
  size: 1040,
  minWidth: 720,
  maxWidth: 1400,
};
