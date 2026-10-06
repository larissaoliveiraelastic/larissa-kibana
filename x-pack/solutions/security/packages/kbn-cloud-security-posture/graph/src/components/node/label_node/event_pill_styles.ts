/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { CSSProperties } from 'react';
import { HandleStyleOverride } from '../styles';
import type { DocumentAnalysisOutput } from './analyze_documents';

/**
 * Figma Event / Relationship / Alert pill shell
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2/-9.5--Graph-viz---Component-Library?node-id=14980-17219
 *
 * Padding 10 (top/left/bottom) · right 14 (+4 so trailing label isn’t flush) · height 40 · width hug · colors:
 * - fill: Backgrounds/Light/Primary
 * - border: Borders/Base/Primary
 * - text: Text/Paragraph
 * Layout: [type badge(s)] [label] — alert badge first when mixed.
 */
/** Horizontal inset (left) from pill edge to badges. */
export const EVENT_PILL_PADDING_X = 10;
/** Right inset — 4px more than left so the trailing label isn’t flush. */
export const EVENT_PILL_PADDING_RIGHT = EVENT_PILL_PADDING_X + 4;
/** @deprecated Use EVENT_PILL_PADDING_RIGHT — label now sits after badges. */
export const EVENT_PILL_PADDING_LEFT = EVENT_PILL_PADDING_RIGHT;
export const EVENT_PILL_PADDING_Y = 10;
/** Total pill height: padY + content (20) + padY. */
export const EVENT_PILL_HEIGHT = EVENT_PILL_PADDING_Y * 2 + 20;

/** Group stack peek under the pill (Figma “grouped” layer). */
export const EVENT_GROUP_STACK_HEIGHT = 4;

/**
 * Figma Fine print (small) / Semi bold — event, relationship, and alert pill labels.
 */
export const EVENT_PILL_LABEL_FONT_SIZE = 14;
export const EVENT_PILL_LABEL_LINE_HEIGHT = 20;

/**
 * Type badge chip inside the event pill (cube / alert / cluster).
 * Figma: 28×20 — width grows with count; height stays 20.
 */
export const EVENT_TYPE_BADGE_WIDTH = 28;
export const EVENT_TYPE_BADGE_HEIGHT = 20;
/** Glyph size inside the 20px-tall badge. */
export const EVENT_TYPE_BADGE_ICON_SIZE = 14;

/** @deprecated Use EVENT_TYPE_BADGE_HEIGHT — kept for older imports. */
export const EVENT_TYPE_BADGE_HEIGHT_LEGACY = EVENT_TYPE_BADGE_HEIGHT;

/** Pin edge handles to the pill midpoint, not the full node (incl. metadata). */
export const pillHandleStyle: CSSProperties = {
  ...HandleStyleOverride,
  top: EVENT_PILL_HEIGHT / 2,
};

/** @deprecated Truncation removed — pills hug full label width. */
export const LABEL_PILL_TEXT_MAX_WIDTH = 160;

export type EventPillTone = 'event' | 'alert' | 'mixed' | 'relationship';

export interface EventPillColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const getEventPillTone = (analysis: DocumentAnalysisOutput): EventPillTone => {
  if (analysis.uniqueAlertsCount > 0 && analysis.uniqueEventsCount > 0) {
    return 'mixed';
  }
  if (analysis.uniqueAlertsCount > 0) {
    return 'alert';
  }
  return 'event';
};

/**
 * Event / alert / relationship pill shell — Backgrounds/Light/Primary + Borders/Base/Primary.
 * Icon badge is separate: all variants → Base/Plain (white); Alert icon/text stays danger.
 *
 * States:
 * - Default / Hover → Borders/Base/Primary
 * - Active / Active hover → Borders/Strong/Primary
 */
export const getEventPillColors = (
  _tone: EventPillTone,
  isActive: boolean,
  euiTheme: EuiThemeComputed
): EventPillColors => {
  return {
    backgroundColor: euiTheme.colors.backgroundLightPrimary,
    borderColor: isActive
      ? euiTheme.colors.borderStrongPrimary
      : euiTheme.colors.borderBasePrimary,
    textColor: euiTheme.colors.textParagraph,
  };
};

/**
 * Pill chrome: outer 1px ring (padding 10 + height 40)
 * plus elevation (default X-small; hover uses EUI shadow small).
 */
export const getEventPillBoxShadow = (borderColor: string, elevationShadowCss: string): string => {
  const elevation = elevationShadowCss
    .replace(/^[\s\n]*box-shadow:\s*/i, '')
    .replace(/;[\s\n]*$/g, '')
    .trim();
  return `box-shadow: 0 0 0 1px ${borderColor}, ${elevation};`;
};
