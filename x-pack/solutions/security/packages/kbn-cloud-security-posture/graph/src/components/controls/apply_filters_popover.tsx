/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type PropsWithChildren } from 'react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiPopoverProps, IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';
import { GraphTopLeftFloatingPanel } from './graph_top_left_floating_panel';
import cubeIcon from '../../assets/icons/cube.svg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GraphFiltersState {
  highlightOriginsOnly: boolean;
  relationshipTypes: {
    owns: boolean;
    accessFrequently: boolean;
    dependsOn: boolean;
    communicatesWith: boolean;
    reportsTo: boolean;
  };
  nodeMetadata: {
    /** Single-entity Sub-type row — first body field when Display toggle is on. */
    subType: boolean;
    source: boolean;
    ipAddress: boolean;
    geolocation: boolean;
    assetCriticality: boolean;
  };
  eventAlertMetadata: {
    sourceIpAddress: boolean;
    sourceGeolocation: boolean;
  };
}

export const DEFAULT_GRAPH_FILTERS: GraphFiltersState = {
  highlightOriginsOnly: false,
  relationshipTypes: {
    owns: true,
    accessFrequently: true,
    dependsOn: true,
    communicatesWith: true,
    reportsTo: true,
  },
  nodeMetadata: {
    subType: false,
    source: false,
    ipAddress: false,
    geolocation: false,
    assetCriticality: false,
  },
  eventAlertMetadata: {
    sourceIpAddress: true,
    sourceGeolocation: true,
  },
};

/** Full Display menu vs Entity Metadata shortcut on entity hover. */
export type ApplyFiltersPopoverVariant = 'full' | 'nodeMetadata';

// ── Labels ────────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<keyof GraphFiltersState['relationshipTypes'], string> = {
  owns: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.owns', {
    defaultMessage: 'Owns',
  }),
  accessFrequently: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.relationship.accessFrequently',
    { defaultMessage: 'Access frequently' }
  ),
  dependsOn: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.dependsOn', {
    defaultMessage: 'Depends on',
  }),
  communicatesWith: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.relationship.communicatesWith',
    { defaultMessage: 'Communicates with' }
  ),
  reportsTo: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.reportsTo', {
    defaultMessage: 'Reports to',
  }),
};

export const NODE_METADATA_LABELS: Record<keyof GraphFiltersState['nodeMetadata'], string> = {
  subType: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.subType', {
    defaultMessage: 'Sub-type',
  }),
  source: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.source', {
    defaultMessage: 'Source',
  }),
  ipAddress: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.ipAddress', {
    defaultMessage: 'IP address(-es)',
  }),
  geolocation: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.geolocation',
    { defaultMessage: 'Geolocation(-s)' }
  ),
  assetCriticality: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
};

const DISPLAY_ENTITY_METADATA_LABELS: Record<keyof GraphFiltersState['nodeMetadata'], string> = {
  subType: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.entitySubType', {
    defaultMessage: 'Entity sub-type',
  }),
  source: NODE_METADATA_LABELS.source,
  ipAddress: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.ipAddressShort',
    { defaultMessage: 'IP address' }
  ),
  geolocation: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.geolocationShort',
    { defaultMessage: 'Geolocation' }
  ),
  assetCriticality: NODE_METADATA_LABELS.assetCriticality,
};

const NODE_METADATA_SECTION_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.section.singleNodeMetadata',
  { defaultMessage: 'Single node metadata' }
);

const LAYERS_SECTION_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.section.layers',
  { defaultMessage: 'Layers' }
);

const VIEW_OPTIONS_SECTION_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.section.viewOptions',
  { defaultMessage: 'View options' }
);

const ALERT_EVENT_DETAILS_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.layer.alertEvent.title',
  { defaultMessage: 'Alert and event details' }
);

const ALERT_EVENT_DETAILS_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.layer.alertEvent.description',
  { defaultMessage: 'Show or hide alert and event details on graph nodes' }
);

const RELATIONSHIP_TYPES_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.section.relationships',
  { defaultMessage: 'Relationship types' }
);

const RELATIONSHIP_TYPES_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.layer.relationships.description',
  { defaultMessage: 'Filter which relationship types are visible on the graph' }
);

const ENTITY_METADATA_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.layer.entityMetadata.title',
  { defaultMessage: 'Entity metadata' }
);

const ENTITY_METADATA_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.layer.entityMetadata.description',
  { defaultMessage: 'Configure which entity metadata fields are displayed on graph nodes' }
);

const HIGHLIGHT_STARTING_POINT_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.highlightOriginsOnly.description',
  { defaultMessage: 'Highlight the origin entity on the graph' }
);

const SOURCE_IP_ADDRESS_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.eventAlert.sourceIpAddressShort',
  { defaultMessage: 'Source IP address' }
);

const SOURCE_GEOLOCATION_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.eventAlert.sourceGeolocationShort',
  { defaultMessage: 'Source geolocation' }
);

type DisplayLayerId = 'eventAlert' | 'relationships' | 'entityMetadata';

const DISPLAY_PANEL_WIDTH = 736;
const DISPLAY_MENU_WIDTH = 517;
const DISPLAY_TYPE_ICON_SIZE = 40;

// ── Shared sections ───────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
}

const FilterSection = ({ title, children }: PropsWithChildren<SectionProps>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxxs">
        <h4
          css={css`
            margin-bottom: ${euiTheme.size.xs};
          `}
        >
          {title}
        </h4>
      </EuiTitle>
      <EuiFlexGroup direction="column" gutterSize="xs">
        {children}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export interface NodeMetadataFilterSectionProps {
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
  /** Prefix checkbox ids so Display + hover shortcuts can both mount safely. */
  idPrefix?: string;
}

/**
 * Entity / Node metadata toggles — shared by the Display menu and the entity
 * hover shortcut so both write the same {@link GraphFiltersState}.
 */
export const NodeMetadataFilterSection = ({
  filtersState,
  onFiltersChange,
  idPrefix = 'meta',
}: NodeMetadataFilterSectionProps) => {
  const toggle = (key: keyof GraphFiltersState['nodeMetadata']) => {
    onFiltersChange({
      ...filtersState,
      nodeMetadata: {
        ...filtersState.nodeMetadata,
        [key]: !filtersState.nodeMetadata[key],
      },
    });
  };

  return (
    <FilterSection title={NODE_METADATA_SECTION_TITLE}>
      {(
        Object.keys(NODE_METADATA_LABELS) as Array<keyof GraphFiltersState['nodeMetadata']>
      ).map((key) => (
        <EuiFlexItem key={key} grow={false}>
          <EuiCheckbox
            id={`${idPrefix}-${key}`}
            label={<EuiText size="s">{NODE_METADATA_LABELS[key]}</EuiText>}
            checked={filtersState.nodeMetadata[key]}
            onChange={() => toggle(key)}
          />
        </EuiFlexItem>
      ))}
    </FilterSection>
  );
};

const LayerTypeIcon = ({ type }: { type: IconType }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        flex-shrink: 0;
        width: ${DISPLAY_TYPE_ICON_SIZE}px;
        height: ${DISPLAY_TYPE_ICON_SIZE}px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: ${euiTheme.size.m};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
      `}
    >
      <EuiIcon type={type} size="m" color="text" aria-hidden />
    </div>
  );
};

const DisplayMenuItem = ({
  iconType,
  title,
  description,
  isSelected,
  onSelect,
  showChevron = true,
  isPressed,
}: {
  iconType: IconType;
  title: string;
  description: string;
  isSelected?: boolean;
  onSelect?: () => void;
  showChevron?: boolean;
  isPressed?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!interactive}
      css={css`
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        padding: ${euiTheme.size.m} ${euiTheme.size.base};
        border: none;
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        text-align: left;
        cursor: ${interactive ? 'pointer' : 'default'};
        ${isSelected
          ? `box-shadow: inset ${euiTheme.border.width.thick} 0 0 0 ${euiTheme.colors.borderStrongPrimary};`
          : ''}

        &:hover:not(:disabled) {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }
      `}
      aria-current={isSelected ? 'true' : undefined}
      aria-pressed={isPressed}
    >
      <LayerTypeIcon type={iconType} />
      <div
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      </div>
      {showChevron ? <EuiIcon type="arrowRight" size="s" color="subdued" aria-hidden /> : null}
    </button>
  );
};

const DisplayDetailPane = ({
  title,
  isActive,
  children,
}: {
  title: string;
  isActive: boolean;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        grid-area: 1 / 1;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.base} ${euiTheme.size.xl};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        visibility: ${isActive ? 'visible' : 'hidden'};
        pointer-events: ${isActive ? 'auto' : 'none'};
        /* Keep inactive panes in layout so height stays at the tallest option. */
      `}
      aria-hidden={!isActive}
      // Prevent keyboard focus into stacked, hidden option panes.
      {...(!isActive ? ({ inert: '' } as React.HTMLAttributes<HTMLDivElement>) : undefined)}
    >
      <EuiTitle size="xxxs">
        <h5>{title}</h5>
      </EuiTitle>
      {children}
    </div>
  );
};

const DisplayMasterDetailBody = ({
  filtersState,
  onFiltersChange,
}: {
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedLayer, setSelectedLayer] = useState<DisplayLayerId>('eventAlert');

  type ObjectFilterSection = 'relationshipTypes' | 'nodeMetadata' | 'eventAlertMetadata';
  const toggle = <K extends ObjectFilterSection>(section: K, key: keyof GraphFiltersState[K]) => {
    onFiltersChange({
      ...filtersState,
      [section]: {
        ...filtersState[section],
        [key]: !filtersState[section][key],
      },
    });
  };

  const highlightOriginsOnlyLabel = i18n.translate(
    'securitySolutionPackages.csp.graph.filters.highlightOriginsOnly',
    { defaultMessage: 'Highlight starting point' }
  );

  const sectionLabelCss = css`
    padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s};
  `;

  return (
    <div
      css={css`
        display: flex;
        align-items: stretch;
        flex: 0 0 auto;
        width: 100%;
      `}
    >
      <div
        css={css`
          flex: 0 0 ${DISPLAY_MENU_WIDTH}px;
          width: ${DISPLAY_MENU_WIDTH}px;
          border-right: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          overflow-x: hidden;
          overflow-y: auto;
        `}
      >
        <EuiTitle size="xxxs">
          <h6 css={sectionLabelCss}>{LAYERS_SECTION_TITLE}</h6>
        </EuiTitle>
        <DisplayMenuItem
          iconType={cubeIcon}
          title={ALERT_EVENT_DETAILS_TITLE}
          description={ALERT_EVENT_DETAILS_DESCRIPTION}
          isSelected={selectedLayer === 'eventAlert'}
          onSelect={() => setSelectedLayer('eventAlert')}
        />
        <DisplayMenuItem
          iconType="cluster"
          title={RELATIONSHIP_TYPES_TITLE}
          description={RELATIONSHIP_TYPES_DESCRIPTION}
          isSelected={selectedLayer === 'relationships'}
          onSelect={() => setSelectedLayer('relationships')}
        />
        <DisplayMenuItem
          iconType="storage"
          title={ENTITY_METADATA_TITLE}
          description={ENTITY_METADATA_DESCRIPTION}
          isSelected={selectedLayer === 'entityMetadata'}
          onSelect={() => setSelectedLayer('entityMetadata')}
        />
        <EuiTitle size="xxxs">
          <h6 css={sectionLabelCss}>{VIEW_OPTIONS_SECTION_TITLE}</h6>
        </EuiTitle>
        <DisplayMenuItem
          iconType="flag"
          title={highlightOriginsOnlyLabel}
          description={HIGHLIGHT_STARTING_POINT_DESCRIPTION}
          showChevron={false}
          isPressed={filtersState.highlightOriginsOnly}
          onSelect={() =>
            onFiltersChange({
              ...filtersState,
              highlightOriginsOnly: !filtersState.highlightOriginsOnly,
            })
          }
        />
      </div>
      <div
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          display: grid;
          align-self: stretch;
          background: ${euiTheme.colors.backgroundBaseSubdued};
          overflow-x: hidden;
          overflow-y: auto;
        `}
      >
        <DisplayDetailPane
          title={ALERT_EVENT_DETAILS_TITLE}
          isActive={selectedLayer === 'eventAlert'}
        >
          <EuiCheckbox
            id="display-evt-sourceIpAddress"
            compressed
            label={<EuiText size="s">{SOURCE_IP_ADDRESS_LABEL}</EuiText>}
            checked={filtersState.eventAlertMetadata.sourceIpAddress}
            onChange={() => toggle('eventAlertMetadata', 'sourceIpAddress')}
          />
          <EuiCheckbox
            id="display-evt-sourceGeolocation"
            compressed
            label={<EuiText size="s">{SOURCE_GEOLOCATION_LABEL}</EuiText>}
            checked={filtersState.eventAlertMetadata.sourceGeolocation}
            onChange={() => toggle('eventAlertMetadata', 'sourceGeolocation')}
          />
        </DisplayDetailPane>
        <DisplayDetailPane
          title={RELATIONSHIP_TYPES_TITLE}
          isActive={selectedLayer === 'relationships'}
        >
          {(
            Object.keys(filtersState.relationshipTypes) as Array<
              keyof GraphFiltersState['relationshipTypes']
            >
          ).map((key) => (
            <EuiCheckbox
              key={key}
              id={`display-rel-${key}`}
              compressed
              label={<EuiText size="s">{RELATIONSHIP_LABELS[key]}</EuiText>}
              checked={filtersState.relationshipTypes[key]}
              onChange={() => toggle('relationshipTypes', key)}
            />
          ))}
        </DisplayDetailPane>
        <DisplayDetailPane
          title={ENTITY_METADATA_TITLE}
          isActive={selectedLayer === 'entityMetadata'}
        >
          {(
            Object.keys(DISPLAY_ENTITY_METADATA_LABELS) as Array<
              keyof GraphFiltersState['nodeMetadata']
            >
          ).map((key) => (
            <EuiCheckbox
              key={key}
              id={`display-meta-${key}`}
              compressed
              label={<EuiText size="s">{DISPLAY_ENTITY_METADATA_LABELS[key]}</EuiText>}
              checked={filtersState.nodeMetadata[key]}
              onChange={() => toggle('nodeMetadata', key)}
            />
          ))}
        </DisplayDetailPane>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface ApplyFiltersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
  /**
   * `full` — Display control (relationships + entity + event/alert metadata).
   * `nodeMetadata` — entity hover shortcut (Entity Metadata only).
   */
  variant?: ApplyFiltersPopoverVariant;
  /**
   * `anchored` — classic EuiPopover next to the trigger (hover shortcut).
   * `graphTopLeft` — fixed at the top-left of the graph canvas (bottom-bar Display).
   */
  placement?: 'anchored' | 'graphTopLeft';
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  children: React.ReactElement;
}

export const ApplyFiltersPopover = ({
  isOpen,
  onClose,
  filtersState,
  onFiltersChange,
  children,
  variant = 'full',
  placement = 'anchored',
  anchorPosition = 'upCenter',
}: ApplyFiltersPopoverProps) => {
  const fullscreenContext = useGraphFullscreenContext();
  const popoverContainer =
    fullscreenContext?.isFullscreen && fullscreenContext.overlayContainerRef.current
      ? fullscreenContext.overlayContainerRef.current
      : undefined;

  const isNodeMetadataOnly = variant === 'nodeMetadata';

  const displayTitle = i18n.translate(
    'securitySolutionPackages.csp.graph.filters.popover.displayTitle',
    { defaultMessage: 'Display' }
  );
  const displayTitleId = useGeneratedHtmlId();

  const ariaLabel = isNodeMetadataOnly
    ? i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadataPopover.ariaLabel', {
        defaultMessage: 'Single node metadata display options',
      })
    : i18n.translate('securitySolutionPackages.csp.graph.filters.popover.ariaLabel', {
        defaultMessage: 'Apply graph filters',
      });

  const hoverPanelBody = (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      css={css`
        min-width: 220px;
        max-width: 260px;
      `}
    >
      <NodeMetadataFilterSection
        filtersState={filtersState}
        onFiltersChange={onFiltersChange}
        idPrefix="hover-meta"
      />
    </EuiFlexGroup>
  );

  if (placement === 'graphTopLeft') {
    return (
      <GraphTopLeftFloatingPanel
        isOpen={isOpen}
        onClose={onClose}
        title={displayTitle}
        titleId={displayTitleId}
        aria-label={ariaLabel}
        data-test-subj="graphDisplayOptionsPanel"
        layout="divided"
        width={DISPLAY_PANEL_WIDTH}
        body={
          <DisplayMasterDetailBody
            filtersState={filtersState}
            onFiltersChange={onFiltersChange}
          />
        }
      >
        {children}
      </GraphTopLeftFloatingPanel>
    );
  }

  return (
    <EuiPopover
      button={children}
      isOpen={isOpen}
      closePopover={onClose}
      container={popoverContainer}
      closePopoverOnScroll={false}
      anchorPosition={anchorPosition}
      panelPaddingSize="m"
      panelProps={{
        onMouseDown: (event) => {
          event.stopPropagation();
        },
      }}
      aria-label={ariaLabel}
    >
      {hoverPanelBody}
    </EuiPopover>
  );
};
