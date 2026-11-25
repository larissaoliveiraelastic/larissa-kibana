/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prototype options.
 * `b` is Option A: settings nodes on the canvas. It is the default.
 * `e` is Option E: a copy of Option A, until the next change.
 * `card` is Option B: information card on the canvas, plus a separate settings button.
 * `a` is Option C: the same card as Option B. Only the settings button moves, into the zoom controls.
 * `d` is Option D: duplication. Description card, and the header gear opens the settings flyout.
 * `c` stays in the type for older prototype code and is not offered.
 */
export type WorkflowSettingsSurfaceVariant = 'a' | 'b' | 'c' | 'd' | 'e' | 'card';

/** Option B canvas card arrangements. */
export type WorkflowSettingsBNodeLayout = 'row' | 'vertical' | 'compact';

const VARIANT_STORAGE_KEY = 'workflows.settingsSurfaceVariant';
const B_LAYOUT_STORAGE_KEY = 'workflows.settingsSurfaceBNodeLayout';

let sessionVariant: WorkflowSettingsSurfaceVariant | undefined;
let sessionBLayout: WorkflowSettingsBNodeLayout | undefined;
const listeners = new Set<() => void>();

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

export const getWorkflowSettingsSurfaceVariant = (): WorkflowSettingsSurfaceVariant => {
  if (sessionVariant) return sessionVariant;
  try {
    const stored = sessionStorage.getItem(VARIANT_STORAGE_KEY);
    if (
      stored === 'b' ||
      stored === 'e' ||
      stored === 'card' ||
      stored === 'a' ||
      stored === 'd'
    ) {
      sessionVariant = stored;
      return stored;
    }
  } catch {
    // sessionStorage unavailable
  }
  sessionVariant = 'b';
  try {
    sessionStorage.setItem(VARIANT_STORAGE_KEY, 'b');
  } catch {
    // sessionStorage unavailable
  }
  return 'b';
};

export const setWorkflowSettingsSurfaceVariant = (next: WorkflowSettingsSurfaceVariant): void => {
  sessionVariant = next;
  try {
    sessionStorage.setItem(VARIANT_STORAGE_KEY, next);
  } catch {
    // sessionStorage unavailable
  }
  notify();
};

export const getWorkflowSettingsBNodeLayout = (): WorkflowSettingsBNodeLayout => {
  if (sessionBLayout) return sessionBLayout;
  try {
    const stored = sessionStorage.getItem(B_LAYOUT_STORAGE_KEY);
    if (stored === 'row' || stored === 'vertical' || stored === 'compact') {
      sessionBLayout = stored;
      return stored;
    }
  } catch {
    // sessionStorage unavailable
  }
  sessionBLayout = 'row';
  return 'row';
};

export const setWorkflowSettingsBNodeLayout = (next: WorkflowSettingsBNodeLayout): void => {
  sessionBLayout = next;
  try {
    sessionStorage.setItem(B_LAYOUT_STORAGE_KEY, next);
  } catch {
    // sessionStorage unavailable
  }
  // Selecting a B layout implies Option B.
  if (sessionVariant !== 'b') {
    sessionVariant = 'b';
    try {
      sessionStorage.setItem(VARIANT_STORAGE_KEY, 'b');
    } catch {
      // sessionStorage unavailable
    }
  }
  notify();
};

/** Option A and Option E. Settings nodes on the canvas. */
export const isCanvasNodeSettingsSurface = (
  variant: WorkflowSettingsSurfaceVariant
): boolean => variant === 'b' || variant === 'e';

/** Options B, C, and D. All show the description card. */
export const isDescriptionCardSettingsSurface = (
  variant: WorkflowSettingsSurfaceVariant
): boolean => variant === 'card' || variant === 'a' || variant === 'd';

/** Option D. Header gear flyout, alongside the description card. */
export const isHeaderGearSettingsSurface = (
  variant: WorkflowSettingsSurfaceVariant
): boolean => variant === 'd';

export const subscribeWorkflowSettingsSurfaceVariant = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** @internal clears session variant between Jest cases. */
export const resetWorkflowSettingsSurfaceVariantForTests = (): void => {
  sessionVariant = undefined;
  sessionBLayout = undefined;
  listeners.clear();
  try {
    sessionStorage.removeItem(VARIANT_STORAGE_KEY);
    sessionStorage.removeItem(B_LAYOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
};
