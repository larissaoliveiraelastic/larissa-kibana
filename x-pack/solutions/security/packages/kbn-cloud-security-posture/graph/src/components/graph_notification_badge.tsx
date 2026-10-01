/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Interpolation, Theme } from '@emotion/react';
import { EuiNotificationBadge, type EuiNotificationBadgeProps } from '@elastic/eui';

/**
 * Thin wrapper around {@link EuiNotificationBadge} so graph chrome shares one
 * import. Keeps EUI defaults (accent fill, `border.radius.small / 2`) — do not
 * force pill (`999px`) radius or hollow/outline colors.
 */
export const GraphNotificationBadge = ({
  css: customCss,
  ...props
}: EuiNotificationBadgeProps) => (
  <EuiNotificationBadge css={customCss as Interpolation<Theme>} {...props} />
);
