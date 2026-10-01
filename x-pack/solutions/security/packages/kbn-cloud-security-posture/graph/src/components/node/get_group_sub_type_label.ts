/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fallback when a group node has no `subType` field — shorten a title like
 * "Macbook Entities" → "Macbook". Prefer an explicit `subType` on the node model.
 */
export const getGroupSubTypeLabel = (groupLabel?: string): string | undefined => {
  if (!groupLabel) return undefined;
  const trimmed = groupLabel.trim();
  const withoutSuffix = trimmed.replace(
    /\s+(entities|instances|buckets|hosts|users|services)$/i,
    ''
  );
  return withoutSuffix || trimmed;
};

/**
 * True when Sub-type would only repeat the group title (e.g. label "Macbook Entities"
 * + subType "Macbook"). In that case the body row should stay hidden.
 */
export const isRedundantGroupSubType = (
  groupLabel?: string,
  subType?: string
): boolean => {
  if (!groupLabel || !subType) return false;
  const normalize = (value: string) => value.trim().toLowerCase();
  const label = normalize(groupLabel);
  const type = normalize(subType);
  if (!type) return false;
  if (label === type) return true;
  // "ec2 instances", "macbook entities" — title already leads with the subtype word
  if (label.startsWith(`${type} `)) return true;
  return normalize(getGroupSubTypeLabel(groupLabel) ?? '') === type;
};
