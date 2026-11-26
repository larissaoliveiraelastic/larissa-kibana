/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { stringify as stringifyYaml } from 'yaml';
import { i18n } from '@kbn/i18n';
import { MAP_DIRECTIVE } from '@kbn/workflows-extensions/common';
import { isRecord, isReferenceValue } from '@kbn/workflows-yaml';
import { CodeField } from './code_field';
import { ConnectorIdField } from './connector_id_field';
import { KeyValueField } from './key_value_field';
import { ListField } from './list_field';
import { ReferenceCapableField } from './reference_capable_field';
import { SchemaOptionsField } from './schema_options_field';
import { ReferenceTextInput } from './reference_text_input';
import { ReferenceValueBox } from './reference_value_box';
import { FieldDescriptionIconSlot, StepValidatedFormRow } from './step_validated_form_row';
import type { ValueSource } from './value_source_toggle';
import { ValueSourceToggle } from './value_source_toggle';
import { VariantField } from './variant_field';
import type { buildDataReferenceCatalog } from '../lib/build_data_reference_catalog';
import {
  formatDataReferenceToken,
  formatValueReferenceToken,
} from '../lib/build_data_reference_catalog';
import { containsMapDirective } from '../lib/contains_map_directive';
import { asJsonField, fromTags, isTagValue, toTags } from '../lib/list_value';
import type { ReferenceForm } from '../lib/reference_value';
import {
  isContainerReference,
  isSingleValueReference,
  lookupReferenceTypeLabel,
  parseWholeReference,
} from '../lib/reference_value';
import {
  fieldId,
  fieldLabelDivergesFromKey,
  isEmptyFieldValue,
  isFieldValueRepresentable,
  type StepFormField,
  validateStepField,
} from '../lib/step_form_schema';

/** A value the form cannot edit (it uses `$map`): its YAML, read-only, and where to edit it. */
function YamlOnlyValue({
  value,
  ariaLabel,
  testSubj,
}: {
  value: unknown;
  ariaLabel: string;
  testSubj: string;
}) {
  const yaml = stringifyYaml(value).trim();
  return (
    <>
      <EuiTextArea
        compressed
        fullWidth
        readOnly
        resize="none"
        rows={Math.min(yaml.split('\n').length, 8)}
        value={yaml}
        aria-label={ariaLabel}
        data-test-subj={testSubj}
      />
      <EuiText size="xs" color="subdued" data-test-subj={`${testSubj}-yamlHint`}>
        {i18n.translate('workflows.stepConfigPanel.keyValue.yamlOnlyHint', {
          defaultMessage: 'Uses {directive}, which the form cannot edit. Edit it in the YAML tab.',
          values: { directive: MAP_DIRECTIVE },
        })}
      </EuiText>
    </>
  );
}

/**
 * Optional-field trash, centered on the control. The label sits above that control,
 * so centering on the whole row would leave the icon at the top of the field.
 */
function OptionalFieldRow({
  children,
  remove,
}: {
  children: React.ReactNode;
  remove: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [marginTop, setMarginTop] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const align = () => {
      const control = root.querySelector('.euiFormRow__fieldWrapper')?.firstElementChild;
      const icon = root.querySelector('[data-test-subj^="workflowStepConfigRemoveOptional-"]');
      if (!(control instanceof HTMLElement) || !(icon instanceof HTMLElement)) return;
      const rootTop = root.getBoundingClientRect().top;
      const controlBox = control.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const desired = controlBox.top - rootTop + (controlBox.height - iconBox.height) / 2;
      const delta = desired - (iconBox.top - rootTop);
      setMarginTop((current) => {
        const next = current + delta;
        return Math.abs(next - current) < 0.5 ? current : next;
      });
    };

    align();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(align);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="workflowStepConfigFieldRow">
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div css={{ marginTop }}>{remove}</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

export function StepFieldRow({
  field,
  value,
  showValidation,
  referenceCatalog,
  showOptionalMarker,
  onRemove,
  onChange,
  onDraftErrorChange,
  onExpand,
  renderSubField,
}: {
  field: StepFormField;
  value: unknown;
  showValidation: boolean;
  referenceCatalog: ReturnType<typeof buildDataReferenceCatalog>;
  showOptionalMarker: boolean;
  onRemove?: () => void;
  onChange: (value: unknown) => void;
  onDraftErrorChange: (error: string | undefined) => void;
  onExpand: () => void;
  /** Renders a field of the chosen way of writing a `variants` field. */
  renderSubField: (
    field: StepFormField,
    options: { showOptionalMarker: boolean }
  ) => React.ReactElement;
}) {
  const { euiTheme } = useEuiTheme();
  const switchId = useGeneratedHtmlId({ prefix: `workflowStepConfigSwitch-${fieldId(field)}` });
  const [accused, setAccused] = useState(false);
  const [jsonDraftError, setJsonDraftError] = useState<string | undefined>();
  const fixedOnly = field.templatable === false;
  const testSubj = `workflowStepConfigField-${field.path.join('.')}`;
  // Fixed | Data: any whole reference is "Data". Switching to Data before anything is picked
  // keeps the typed value until a pick replaces it.
  // Lists whose items aren't typed text (`foreach`) usually come from earlier data: start there.
  const [forcedData, setForcedData] = useState(
    field.preferData === true && isEmptyFieldValue(value)
  );
  const valueIsReference = isReferenceValue(value);
  const source: ValueSource = !fixedOnly && (valueIsReference || forcedData) ? 'data' : 'fixed';

  useEffect(() => {
    if (showValidation) setAccused(true);
  }, [showValidation]);

  const onDraftErrorChangeRef = useRef(onDraftErrorChange);
  onDraftErrorChangeRef.current = onDraftErrorChange;
  // Clear parent draft-error slot only when this row unmounts — not when the
  // parent re-creates the callback identity on every render.
  useEffect(() => () => onDraftErrorChangeRef.current(undefined), []);

  const setDraftError = useCallback((error: string | undefined) => {
    setJsonDraftError(error);
    onDraftErrorChangeRef.current(error);
  }, []);
  // The key/value rows show their own errors beside the row; the panel only needs to know.
  const reportDraftError = useCallback(
    (error: string | undefined) => onDraftErrorChangeRef.current(error),
    []
  );

  const optionalLabel = i18n.translate('workflows.stepConfigPanel.optional', {
    defaultMessage: 'Optional',
  });
  const removeLabel = i18n.translate('workflows.stepConfigPanel.removeOptionalField', {
    defaultMessage: 'Remove field',
  });
  const representable = isFieldValueRepresentable(field, value);
  const schemaError = representable ? validateStepField(field, value) : undefined;
  const errorMessage = jsonDraftError ?? schemaError;
  // Slow accusation (blur/save), fast forgiveness once already marked invalid.
  const isInvalid = (showValidation || accused) && !!errorMessage;
  const showYamlKeyHint = fieldLabelDivergesFromKey(field.key, field.label);

  const accuseIfInvalid = useCallback(() => {
    const nextError =
      jsonDraftError ?? (representable ? validateStepField(field, value) : undefined);
    if (nextError) setAccused(true);
  }, [jsonDraftError, representable, field, value]);

  const labelContent = (
    <span css={{ display: 'inline-flex', alignItems: 'baseline', gap: euiTheme.size.xs }}>
      <span>{field.label}</span>
      {showYamlKeyHint ? (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj={`workflowStepConfigFieldKey-${field.path.join('.')}`}
          css={{ fontFamily: euiTheme.font.familyCode }}
        >
          {field.key}
        </EuiText>
      ) : null}
      {showOptionalMarker ? (
        <EuiText size="xs" color="subdued">
          {optionalLabel}
        </EuiText>
      ) : null}
      <FieldDescriptionIconSlot />
    </span>
  );


  const handleSourceChange = (next: ValueSource) => {
    if (next === 'data') {
      setForcedData(true);
      return;
    }
    setForcedData(false);
    // Only a reference needs clearing; a typed value that was kept stays as it is.
    if (valueIsReference) {
      onChange(
        field.kind === 'list' ? [] : field.required && field.kind === 'boolean' ? false : undefined
      );
    }
  };
  const handleDataChange = (next: string | undefined) => {
    setForcedData(true);
    onChange(next);
  };
  // The expanded editor writes straight to the field, so stay on Data if it empties the value.
  const expandFromData = () => {
    setForcedData(true);
    onExpand();
  };
  // The whole-list side means "this reference is the list". A field that needs a list (no single
  // value allowed) cannot take a single value that way, so a pick known to be one value is added
  // as an entry instead (`["{{ x }}"]`), after the entries already there, and the field goes back
  // to its entries. Lists, and references of unknown type, are written as the whole list.
  const handleWholeListChange = (next: string | undefined) => {
    const picked = next === undefined ? undefined : parseWholeReference(next);
    if (
      !picked ||
      field.acceptsSingle === true ||
      !isSingleValueReference(
        picked.expression,
        lookupReferenceTypeLabel(referenceCatalog, picked.expression)
      )
    ) {
      handleDataChange(next);
      return;
    }
    setForcedData(false);
    const entries = valueIsReference ? [] : toTags(value);
    const entry = formatDataReferenceToken(picked.expression);
    onChange(entries.includes(entry) ? entries : [...entries, entry]);
  };
  // Data picked from the tags box. A known list or record is the whole list, which replaces the
  // entries (after a confirmation when there are some); anything else is one more entry, written
  // as text because that is what an entry of a text list is.
  const [pendingWholeList, setPendingWholeList] = useState<string | undefined>();
  const wholeListModalId = useGeneratedHtmlId({ prefix: 'workflowStepConfigWholeListModal' });
  const handleEntryPick = (token: string) => {
    const picked = parseWholeReference(token);
    if (!picked) return;
    if (
      isContainerReference(
        picked.expression,
        lookupReferenceTypeLabel(referenceCatalog, picked.expression)
      )
    ) {
      const wholeList = formatValueReferenceToken(picked.expression);
      if (toTags(value).length > 0) setPendingWholeList(wholeList);
      else handleDataChange(wholeList);
      return;
    }
    const entries = toTags(value);
    const entry = formatDataReferenceToken(picked.expression);
    onChange(
      entries.includes(entry)
        ? entries
        : fromTags([...entries, entry], field.acceptsSingle === true)
    );
  };
  // A list whose items aren't text (objects, numbers) stays in the JSON editor, as before.
  const listIsTags = field.kind === 'list' && isTagValue(value);
  // A JSON field takes Fixed | Data only when its schema says it usually holds a reference.
  const codeTakesData = field.kind === 'code' && field.preferData === true;
  const hasSourceToggle =
    !fixedOnly &&
    (field.kind === 'boolean' ||
      field.kind === 'number' ||
      field.kind === 'connector-id' ||
      listIsTags ||
      codeTakesData);
  const sourceToggle = hasSourceToggle ? (
    <ValueSourceToggle
      source={source}
      fieldLabel={field.label}
      onChange={handleSourceChange}
      labels={
        listIsTags
          ? {
              fixed: i18n.translate('workflows.stepConfigPanel.valueSource.listEntries', {
                defaultMessage: 'Entries',
              }),
              data: i18n.translate('workflows.stepConfigPanel.valueSource.listFromData', {
                defaultMessage: 'From data',
              }),
            }
          : undefined
      }
      data-test-subj={`${testSubj}-source`}
    />
  ) : undefined;
  // Dropdowns hold text, so their reference is the text form; numbers and yes/no keep their type.
  const referenceForm: ReferenceForm =
    field.kind === 'select' || field.kind === 'connector-id' ? 'text' : 'value';

  const renderDataBox = (
    overrides: Partial<React.ComponentProps<typeof ReferenceValueBox>> = {}
  ) => (
    <ReferenceValueBox
      catalog={referenceCatalog}
      value={value}
      form={referenceForm}
      onChange={handleDataChange}
      isInvalid={isInvalid}
      onBlur={accuseIfInvalid}
      ariaLabel={field.label}
      data-test-subj={testSubj}
      {...overrides}
    />
  );

  // Trash sits beside the field, using the same icon as the Manual trigger remove control.
  const removeControl = onRemove ? (
    <EuiToolTip content={removeLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        aria-label={removeLabel}
        onClick={onRemove}
        data-test-subj={`workflowStepConfigRemoveOptional-${fieldId(field)}`}
      />
    </EuiToolTip>
  ) : undefined;

  // "Optional" stays with the label. The trash sits beside the control, not in the label.
  const labelAppend = sourceToggle;

  const wrapRow = (child: React.ReactElement) =>
    removeControl ? (
      <OptionalFieldRow remove={removeControl}>{child}</OptionalFieldRow>
    ) : (
      <div className="workflowStepConfigFieldRow">{child}</div>
    );

  const fixedOnlyHint = i18n.translate('workflows.stepConfigPanel.fixedOnlyHint', {
    defaultMessage: 'Read exactly as typed. Not a template.',
  });
  const fixedOnlyAppend = <EuiIcon type="lock" aria-hidden />;
  const description = representable ? field.description : undefined;
  // Status and hints stay under the control; only the description can move behind an icon.
  const helpText = !representable
    ? i18n.translate('workflows.stepConfigPanel.definedInYaml', {
        defaultMessage: 'Defined in YAML',
      })
    : fixedOnly
    ? fixedOnlyHint
    : undefined;

  if (!representable) {
    return wrapRow(
      <StepValidatedFormRow
        label={labelContent}
        labelAppend={labelAppend}
        helpText={helpText}
        isInvalid={false}
        fullWidth
        display="row"
      >
        <EuiFieldText
          compressed
          fullWidth
          readOnly
          value={stringifyYaml(value).trim()}
          data-test-subj={`${testSubj}-readonly`}
        />
      </StepValidatedFormRow>
    );
  }

  if (field.kind === 'boolean') {
    if (source === 'data') {
      return wrapRow(
        <StepValidatedFormRow
          label={labelContent}
          labelAppend={labelAppend}
          description={description}
          helpText={helpText}
          isInvalid={isInvalid}
          error={errorMessage}
          fullWidth
          display="row"
        >
          {renderDataBox({ onExpand: expandFromData })}
        </StepValidatedFormRow>
      );
    }

    // This row has no label row to hold an icon, so its description always stays under it.
    const switchHelpText = [description, helpText].filter(Boolean).join(' ');
    return (
      <div
        className="workflowStepConfigFieldRow"
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: euiTheme.size.xs,
        }}
        data-test-subj={`${testSubj}-row`}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: euiTheme.size.s,
            flexWrap: 'wrap',
          }}
        >
          <div
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
              minWidth: 0,
            }}
          >
            <label htmlFor={switchId} css={{ cursor: 'pointer' }}>
              {labelContent}
            </label>
            <EuiSwitch
              id={switchId}
              compressed
              label={field.label}
              showLabel={false}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              aria-describedby={switchHelpText ? `${switchId}-help` : undefined}
              data-test-subj={testSubj}
            />
          </div>
          <div css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s }}>
            {sourceToggle}
            {removeControl}
          </div>
        </div>
        {switchHelpText ? (
          <EuiText size="xs" color="subdued" id={`${switchId}-help`}>
            {switchHelpText}
          </EuiText>
        ) : null}
      </div>
    );
  }

  const rowProps = {
    label: labelContent,
    labelAppend,
    description,
    helpText,
    isInvalid,
    error: errorMessage,
    fullWidth: true,
    display: 'row' as const,
  };

  const codeField: StepFormField = field.kind === 'list' ? asJsonField(field) : field;

  switch (field.kind === 'list' && !listIsTags ? 'code' : field.kind) {
    case 'list':
      return wrapRow(
        <>
          <StepValidatedFormRow {...rowProps}>
            {source === 'data' ? (
              renderDataBox({ onChange: handleWholeListChange, keepTypeFor: 'containers' })
            ) : (
              <ListField
                value={value}
                onChange={onChange}
                options={field.options}
                acceptsSingle={field.acceptsSingle === true}
                catalog={referenceCatalog}
                onInsertReference={field.options ? undefined : handleEntryPick}
                ariaLabel={field.label}
                isInvalid={isInvalid}
                onBlur={accuseIfInvalid}
                data-test-subj={testSubj}
              />
            )}
          </StepValidatedFormRow>
          {pendingWholeList ? (
            <EuiConfirmModal
              aria-labelledby={wholeListModalId}
              title={i18n.translate('workflows.stepConfigPanel.list.replaceTitle', {
                defaultMessage: 'Replace the entries with this list?',
              })}
              titleProps={{ id: wholeListModalId }}
              onCancel={() => setPendingWholeList(undefined)}
              onConfirm={() => {
                handleDataChange(pendingWholeList);
                setPendingWholeList(undefined);
              }}
              cancelButtonText={i18n.translate('workflows.stepConfigPanel.list.replaceCancel', {
                defaultMessage: 'Cancel',
              })}
              confirmButtonText={i18n.translate('workflows.stepConfigPanel.list.replaceConfirm', {
                defaultMessage: 'Replace',
              })}
              data-test-subj={`${testSubj}-replaceConfirm`}
            >
              <p>
                {i18n.translate('workflows.stepConfigPanel.list.replaceBody', {
                  defaultMessage:
                    '{field} already has entries. Using the whole list from {reference} replaces them.',
                  values: {
                    field: field.label,
                    reference: parseWholeReference(pendingWholeList)?.expression ?? '',
                  },
                })}
              </p>
            </EuiConfirmModal>
          ) : null}
        </>
      );
    case 'number':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {source === 'data' ? (
            renderDataBox({ onExpand: expandFromData })
          ) : (
            <EuiFieldNumber
              compressed
              fullWidth
              isInvalid={isInvalid}
              value={typeof value === 'number' || typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={accuseIfInvalid}
              append={fixedOnly ? fixedOnlyAppend : undefined}
              data-test-subj={testSubj}
            />
          )}
        </StepValidatedFormRow>
      );
    case 'select':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <SchemaOptionsField
            options={field.options ?? []}
            value={value}
            onChange={onChange}
            isInvalid={isInvalid}
            onBlur={accuseIfInvalid}
            ariaLabel={field.label}
            testSubj={testSubj}
            catalog={referenceCatalog}
          />
        </StepValidatedFormRow>
      );
    case 'connector-id':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {source === 'data' ? (
            renderDataBox({ onExpand: expandFromData })
          ) : (
            <ConnectorIdField
              field={field}
              value={value}
              onChange={onChange}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              testSubj={testSubj}
            />
          )}
        </StepValidatedFormRow>
      );
    case 'variants':
      return wrapRow(
        <VariantField
          field={field}
          value={value}
          onChange={onChange}
          renderField={renderSubField}
          label={labelContent}
          labelAppend={labelAppend}
          // The group carries the description; the fixed-only hint belongs to its control.
          helpText={field.description}
          data-test-subj={`${testSubj}-variantGroup`}
        />
      );
    case 'key-value':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <KeyValueField
            value={value}
            onChange={onChange}
            onDraftErrorChange={reportDraftError}
            catalog={referenceCatalog}
            fieldLabel={field.label}
            addLabel={
              field.path.length === 1
                ? i18n.translate('workflows.stepConfigPanel.keyValue.addVariable', {
                    defaultMessage: 'Add variable',
                  })
                : i18n.translate('workflows.stepConfigPanel.keyValue.addField', {
                    defaultMessage: 'Add field',
                  })
            }
            testSubj={testSubj}
            typedValues={field.typedValues}
            renderJsonValue={(cell) =>
              containsMapDirective(cell.value) ? (
                <YamlOnlyValue
                  value={cell.value}
                  ariaLabel={cell.ariaLabel}
                  testSubj={cell.testSubj}
                />
              ) : (
                <CodeField
                  field={{ ...field, kind: 'code', language: 'json', label: cell.ariaLabel }}
                  value={cell.value}
                  catalog={referenceCatalog}
                  onChange={cell.onChange}
                  testSubj={cell.testSubj}
                  isInvalid={false}
                  onBlur={accuseIfInvalid}
                  onDraftErrorChange={cell.onDraftErrorChange}
                />
              )
            }
          />
        </StepValidatedFormRow>
      );
    case 'code':
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          {codeTakesData && source === 'data' ? (
            renderDataBox()
          ) : (
            <CodeField
              field={codeField}
              value={value}
              catalog={referenceCatalog}
              onChange={onChange}
              testSubj={testSubj}
              isInvalid={isInvalid}
              onBlur={accuseIfInvalid}
              onDraftErrorChange={setDraftError}
              // TODO: ES|QL keeps its specialized editor — no expand here.
              onExpand={field.language === 'esql' ? undefined : onExpand}
              fixedOnly={fixedOnly}
            />
          )}
        </StepValidatedFormRow>
      );
    case 'parallel-branches': {
      // A branch that is not a mapping stands for an empty one, so the positions still line up.
      const branchesArray = Array.isArray(value)
        ? value.map((branch): Record<string, unknown> => (isRecord(branch) ? branch : {}))
        : [];
      const addBranchLabel = i18n.translate(
        'workflows.stepConfigPanel.parallelBranches.addBranch',
        {
          defaultMessage: 'Add branch',
        }
      );
      const deleteBranchLabel = i18n.translate(
        'workflows.stepConfigPanel.parallelBranches.deleteBranch',
        { defaultMessage: 'Delete branch' }
      );
      return wrapRow(
        <StepValidatedFormRow
          label={labelContent}
          labelAppend={labelAppend}
          description={description}
          helpText={helpText}
          isInvalid={isInvalid}
          error={errorMessage}
          fullWidth
          display="row"
        >
          <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}>
            {branchesArray.map((branch, idx) => (
              <div key={idx} css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}>
                <EuiFieldText
                  compressed
                  fullWidth
                  value={branch.name !== undefined ? String(branch.name) : ''}
                  placeholder={i18n.translate(
                    'workflows.stepConfigPanel.parallelBranches.branchPlaceholder',
                    { defaultMessage: 'branch {number}', values: { number: idx + 1 } }
                  )}
                  isInvalid={isInvalid}
                  onChange={(e) => {
                    const next = [...branchesArray];
                    next[idx] = { ...branch, name: e.target.value };
                    onChange(next);
                  }}
                  onBlur={accuseIfInvalid}
                  data-test-subj={`${testSubj}-branch-${idx}`}
                />
                <EuiToolTip content={deleteBranchLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    size="xs"
                    aria-label={deleteBranchLabel}
                    onClick={() => onChange(branchesArray.filter((_, i) => i !== idx))}
                    data-test-subj={`${testSubj}-branch-${idx}-delete`}
                  />
                </EuiToolTip>
              </div>
            ))}
            <div>
              <EuiButtonEmpty
                iconType="plusCircle"
                size="xs"
                flush="left"
                onClick={() => onChange([...branchesArray, { name: '', steps: [] }])}
                data-test-subj={`${testSubj}-addBranch`}
              >
                {addBranchLabel}
              </EuiButtonEmpty>
            </div>
          </div>
        </StepValidatedFormRow>
      );
    }
    case 'text':
    default:
      if (fixedOnly) {
        return wrapRow(
          <StepValidatedFormRow {...rowProps}>
            <EuiFieldText
              compressed
              fullWidth
              isInvalid={isInvalid}
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(e.target.value)}
              onBlur={accuseIfInvalid}
              append={fixedOnlyAppend}
              data-test-subj={testSubj}
            />
          </StepValidatedFormRow>
        );
      }
      return wrapRow(
        <StepValidatedFormRow {...rowProps}>
          <ReferenceCapableField
            catalog={referenceCatalog}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={onChange}
            onExpand={onExpand}
            openOnBrace
          >
            {(bind) => (
              <ReferenceTextInput
                bind={bind}
                catalog={referenceCatalog}
                ariaLabel={field.label}
                isInvalid={isInvalid}
                onBlur={accuseIfInvalid}
                onChange={bind.reportChange}
                testSubj={testSubj}
                warnContainersInSentence
              />
            )}
          </ReferenceCapableField>
        </StepValidatedFormRow>
      );
  }
}
