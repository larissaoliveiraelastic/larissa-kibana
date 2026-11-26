/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFieldText, EuiInputPopover, EuiSelectable, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  formatDataReferenceToken,
  isDataReferenceInsertable,
  type DataReferenceCatalog,
  type DataReferenceGroupId,
  type DataReferenceItem,
} from '../lib/build_data_reference_catalog';
import { getVisibleRows, PickerHeader, ReferenceList } from './data_reference_picker_parts';
import { ReferenceCapableField } from './reference_capable_field';

type ListOption = EuiSelectableOption<{
  readonly kind?: 'fixed' | 'more-fixed' | 'less-fixed';
}>;

/** How many fixed values show before "View more". */
const PREVIEW_COUNT = 3;

function SectionTitle({ label }: { readonly label: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      color="subdued"
      css={{
        fontWeight: euiTheme.font.weight.bold,
        padding: `${euiTheme.size.s} ${euiTheme.size.base} ${euiTheme.size.xs}`,
      }}
    >
      {label}
    </EuiText>
  );
}

export interface SchemaOptionsFieldProps {
  readonly options: readonly string[];
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly isInvalid: boolean;
  readonly onBlur: () => void;
  readonly ariaLabel: string;
  readonly testSubj: string;
  readonly catalog: DataReferenceCatalog;
}

/**
 * A schema option list written in the field itself. Fixed values are the first few schema options.
 * Data is the same variable selector that opens from "{": groups, icons, and type badges.
 * There is no Fixed | Data switch.
 */
export function SchemaOptionsField({
  options,
  value,
  onChange,
  isInvalid,
  onBlur,
  ariaLabel,
  testSubj,
  catalog,
}: SchemaOptionsFieldProps) {
  const { euiTheme } = useEuiTheme();
  const text = value === undefined || value === null ? '' : String(value);
  const [listOpen, setListOpen] = useState(false);
  const [fixedExpanded, setFixedExpanded] = useState(false);
  const [drillStack, setDrillStack] = useState<DataReferenceItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<DataReferenceGroupId>>(
    () => new Set()
  );
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const highlightedRowRef = useRef<HTMLButtonElement | null>(null);
  // Open after the click, so that same click does not close the list.
  const openAfterClick = () => {
    window.setTimeout(() => {
      setFixedExpanded(false);
      setDrillStack([]);
      setExpandedGroups(new Set());
      setHighlightIndex(-1);
      setListOpen(true);
    }, 0);
  };

  const viewMoreLabel = i18n.translate('workflows.stepConfigPanel.schemaOptions.viewMore', {
    defaultMessage: 'View more',
  });
  const showLessLabel = i18n.translate('workflows.stepConfigPanel.schemaOptions.showLess', {
    defaultMessage: 'Show less',
  });
  const fixedLabel = i18n.translate('workflows.stepConfigPanel.valueSource.fixed', {
    defaultMessage: 'Fixed',
  });
  const dataLabel = i18n.translate('workflows.stepConfigPanel.valueSource.data', {
    defaultMessage: 'Data',
  });

  return (
    <ReferenceCapableField
      catalog={catalog}
      value={text}
      onChange={(next) => onChange(next === '' ? undefined : next)}
      openOnBrace
      data-test-subj={`${testSubj}-reference`}
    >
      {(bind) => {
        const query = text.trim().toLowerCase();
        const fixedMatches = options.filter((option) => option.toLowerCase().includes(query));
        const visibleFixed = fixedExpanded
          ? fixedMatches
          : fixedMatches.slice(0, PREVIEW_COUNT);
        const drilledItem = drillStack.length > 0 ? drillStack[drillStack.length - 1] : undefined;
        const visibleRows = getVisibleRows(catalog, query, drilledItem);
        const hasData =
          visibleRows.groups.some((group) => group.items.length > 0) ||
          visibleRows.items.length > 0 ||
          visibleRows.mode === 'search';
        const isDrilled = drillStack.length > 0 && query === '';
        const showList =
          listOpen && !bind.isOpen && !text.includes('{') && (visibleFixed.length > 0 || hasData);
        const selectableOptions: ListOption[] =
          visibleFixed.length > 0 || fixedMatches.length > PREVIEW_COUNT
            ? [
                ...visibleFixed.map(
                  (label): ListOption => ({
                    label,
                    kind: 'fixed',
                    checked: label === text ? 'on' : undefined,
                    'data-test-subj': `${testSubj}-option-${label}`,
                  })
                ),
                ...(fixedMatches.length > PREVIEW_COUNT
                  ? [
                      {
                        label: fixedExpanded ? showLessLabel : viewMoreLabel,
                        kind: fixedExpanded ? ('less-fixed' as const) : ('more-fixed' as const),
                        'data-test-subj': `${testSubj}-viewMore`,
                      },
                    ]
                  : []),
              ]
            : [];

        return (
          <EuiInputPopover
            fullWidth
            disableFocusTrap
            panelPaddingSize="none"
            isOpen={showList}
            closePopover={() => setListOpen(false)}
            input={
              <EuiFieldText
                compressed
                fullWidth
                isInvalid={isInvalid}
                value={text}
                aria-label={ariaLabel}
                inputRef={(el) => bind.attachInputRef(el)}
                onFocus={() => {
                  if (text === '') openAfterClick();
                }}
                onBlur={onBlur}
                onKeyDown={(event) => bind.handleTypeaheadKey(event)}
                onChange={(event) => {
                  const next = event.target.value;
                  const caret = event.target.selectionStart ?? next.length;
                  const typed =
                    next.length === text.length + 1
                      ? next.charAt(Math.max(0, caret - 1))
                      : undefined;
                  setFixedExpanded(false);
                  setDrillStack([]);
                  setExpandedGroups(new Set());
                  setListOpen(!next.includes('{'));
                  bind.reportChange(next, caret, typed);
                }}
                data-test-subj={testSubj}
              />
            }
          >
            <div onMouseDown={(event) => event.preventDefault()}>
              {selectableOptions.length > 0 ? (
                <>
                  <SectionTitle label={fixedLabel} />
                  <div css={{ padding: `0 ${euiTheme.size.base} ${euiTheme.size.s}` }}>
                    <EuiSelectable
                      aria-label={ariaLabel}
                      singleSelection
                      searchable={false}
                      options={selectableOptions}
                      onChange={(next) => {
                        const picked = next.find((option) => option.checked === 'on');
                        if (!picked || picked.isGroupLabel) return;
                        if (picked.kind === 'more-fixed') {
                          setFixedExpanded(true);
                          return;
                        }
                        if (picked.kind === 'less-fixed') {
                          setFixedExpanded(false);
                          return;
                        }
                        onChange(picked.label);
                        setListOpen(false);
                      }}
                      listProps={{ bordered: false, isVirtualized: false, showIcons: false }}
                    >
                      {(list) => list}
                    </EuiSelectable>
                  </div>
                </>
              ) : null}
              {hasData ? (
                <>
                  {isDrilled ? (
                    <PickerHeader
                      drillStack={drillStack}
                      isDrilled
                      onBack={() => setDrillStack((stack) => stack.slice(0, -1))}
                      onNavigate={(depth) => setDrillStack((stack) => stack.slice(0, depth))}
                    />
                  ) : (
                    <SectionTitle label={dataLabel} />
                  )}
                  <div
                    css={{
                      maxHeight: euiTheme.base * 20,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <ReferenceList
                      visibleRows={visibleRows}
                      expandedGroups={expandedGroups}
                      isEmpty={visibleRows.mode === 'search' && visibleRows.items.length === 0}
                      highlightIndex={highlightIndex}
                      highlightedRowRef={highlightedRowRef}
                      onHighlight={setHighlightIndex}
                      onToggleGroup={(groupId) => {
                        setExpandedGroups((current) => {
                          const next = new Set(current);
                          if (next.has(groupId)) next.delete(groupId);
                          else next.add(groupId);
                          return next;
                        });
                      }}
                      onPick={(item) => {
                        if (item.drillable && item.children?.length) {
                          setDrillStack((stack) => [...stack, item]);
                          setHighlightIndex(-1);
                          return;
                        }
                        if (!isDataReferenceInsertable(item)) return;
                        onChange(formatDataReferenceToken(item.path));
                        setListOpen(false);
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </EuiInputPopover>
        );
      }}
    </ReferenceCapableField>
  );
}
