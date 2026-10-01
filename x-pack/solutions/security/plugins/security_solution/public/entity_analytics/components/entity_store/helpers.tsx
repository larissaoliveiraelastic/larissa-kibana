/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Entity } from '@kbn/entity-store/common';

import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../../common/constants';
import {
  getEntityType as getEntityTypeFromCommon,
  sanitizeEntityRecordForUpsert as sanitizeEntityRecordForUpsertFromCommon,
} from '../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';

export const getEntityType = getEntityTypeFromCommon;

export const sanitizeEntityRecordForUpsert = (record: Entity): Entity =>
  sanitizeEntityRecordForUpsertFromCommon(record);

/**
 * Risk fields for entity list / table cells. Entity Store v2 stores scores on
 * `entity.risk.*`; older documents may only have `host.risk.*`, `user.risk.*`, or `service.risk.*`.
 *
 * Prefer `entity.risk` when it has a real score. Reset-to-zero often rewrites
 * `entity.risk` → Unknown/0 while typed risk still holds Critical→Low — fall
 * back to host|user|service.risk in that case (same as the flyout).
 */
export const getEntityRecordRiskForListDisplay = (
  record: Entity
): {
  calculated_level?: string;
  calculated_score_norm?: number;
} | null => {
  const entityRisk = record.entity?.risk;
  const typedRisk =
    ('host' in record && record.host?.risk) ||
    ('user' in record && record.user?.risk) ||
    ('service' in record && record.service?.risk) ||
    undefined;

  const toFields = (
    risk:
      | {
          calculated_level?: string;
          calculated_score_norm?: number;
        }
      | undefined
      | null
  ) =>
    risk
      ? {
          calculated_level: risk.calculated_level,
          calculated_score_norm: risk.calculated_score_norm,
        }
      : null;

  const entityScore = entityRisk?.calculated_score_norm;
  if (entityRisk != null && entityScore != null && entityScore > 0) {
    return toFields(entityRisk);
  }
  if (typedRisk != null && (typedRisk.calculated_score_norm ?? 0) > 0) {
    return toFields(typedRisk);
  }
  return toFields(entityRisk) ?? toFields(typedRisk);
};

// Back-compat re-export for existing `./helpers` importers. New code should import
// directly from `./entity_icon_by_type` to keep the icon map out of this module's
// heavier dependency graph in page-load-sensitive bundles.
export { EntityIconByType } from './entity_icon_by_type';

/**
 * `entity.source` is modeled as a string but Elasticsearch may return a keyword as a
 * single-element array; other shapes should not crash the table cell renderer.
 */
const entitySourceToIndexPattern = (source: unknown): string | null => {
  if (source == null) {
    return null;
  }
  if (typeof source === 'string') {
    return source;
  }
  if (Array.isArray(source)) {
    const firstString = source.find((item): item is string => typeof item === 'string');
    return firstString ?? null;
  }
  if (typeof source === 'number' || typeof source === 'boolean') {
    return String(source);
  }
  return null;
};

export const sourceFieldToText = (source: unknown) => {
  const indexPattern = entitySourceToIndexPattern(source);

  if (indexPattern == null) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.eventDescription"
        defaultMessage="Events"
      />
    );
  }

  if (indexPattern.match(`^${RISK_SCORE_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.riskDescription"
        defaultMessage="Risk"
      />
    );
  }

  if (indexPattern.match(`^${ASSET_CRITICALITY_INDEX_PATTERN}`)) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.assetCriticalityDescription"
        defaultMessage="Asset Criticality"
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.entityStore.helpers.sourceField.eventDescription"
      defaultMessage="Events"
    />
  );
};
