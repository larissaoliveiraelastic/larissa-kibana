/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren, useMemo } from 'react';
import { EuiHorizontalRule, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { NodeViewModel } from '../types';
import { GraphFindInPage } from './graph_find_in_page';
import { GraphEntityFiltersSection } from './graph_entity_filters_section';
import type { GraphEntityFiltersState } from './graph_entity_filters';
import { GraphTopLeftFloatingPanel } from './graph_top_left_floating_panel';
import { GRAPH_PANEL_INSET } from '../constants';

export interface GraphSearchPanelProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeViewModel[];
  entityFilters: GraphEntityFiltersState;
  onEntityFiltersChange: (next: GraphEntityFiltersState) => void;
}

const searchTitle = i18n.translate('securitySolutionPackages.csp.graph.controls.search.title', {
  defaultMessage: 'Search',
});

/**
 * In-graph Search / entity filters — opens as a top-left floating panel
 * (same chrome inset as Display / Keyboard shortcuts).
 */
export const GraphSearchPanel = ({
  isOpen,
  onClose,
  nodes,
  entityFilters,
  onEntityFiltersChange,
  children,
}: GraphSearchPanelProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'graph-search-title' });
  const panelCss = useMemo(
    () => css`
      width: 320px;
      max-width: calc(100vw - ${GRAPH_PANEL_INSET * 2}px);
      padding: ${GRAPH_PANEL_INSET}px;
      box-sizing: border-box;
    `,
    []
  );

  return (
    <GraphTopLeftFloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title={searchTitle}
      titleId={titleId}
      aria-label={searchTitle}
      data-test-subj="graphSearchPanel"
      body={
        <div css={panelCss}>
          <GraphFindInPage nodes={nodes} />
          <EuiHorizontalRule margin="m" />
          <GraphEntityFiltersSection
            filters={entityFilters}
            onFiltersChange={onEntityFiltersChange}
          />
        </div>
      }
    >
      {children as React.ReactElement}
    </GraphTopLeftFloatingPanel>
  );
};
