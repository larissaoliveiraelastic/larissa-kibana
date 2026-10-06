/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { EuiPopover, EuiToolTip, type EuiToolTipProps } from '@elastic/eui';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';

type ToolTipPosition = NonNullable<EuiToolTipProps['position']>;
type PopoverAnchorPosition = NonNullable<React.ComponentProps<typeof EuiPopover>['anchorPosition']>;

const TOOLTIP_TO_POPOVER_POSITION: Record<ToolTipPosition, PopoverAnchorPosition> = {
  top: 'upCenter',
  bottom: 'downCenter',
  left: 'leftCenter',
  right: 'rightCenter',
};

interface GraphControlTooltipProps {
  content: ReactNode;
  children: ReactElement;
  position?: ToolTipPosition;
  disableScreenReaderOutput?: boolean;
  /**
   * Custom hover delay before showing (ms). When set, uses a delayed popover
   * instead of EUI's built-in regular/long tooltip timing — e.g. connector
   * type legends (~2s) vs immediate chrome tooltips.
   */
  delayMs?: number;
}

/**
 * Uses EuiToolTip normally. When the graph is in native browser fullscreen, EUI
 * tooltips (portaled to document.body) are hidden — so we render via EuiPopover
 * into the fullscreen overlay container instead.
 *
 * Pass {@link delayMs} for a longer intentional hold (connector icon legends).
 */
export const GraphControlTooltip = ({
  content,
  children,
  position = 'top',
  disableScreenReaderOutput = false,
  delayMs,
}: GraphControlTooltipProps) => {
  const fullscreenContext = useGraphFullscreenContext();
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<number | undefined>(undefined);
  const useDelayedPopover = delayMs != null || Boolean(fullscreenContext?.isFullscreen);

  useEffect(() => {
    return () => {
      if (openTimerRef.current !== undefined) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  if (!useDelayedPopover) {
    return (
      <EuiToolTip
        content={content}
        position={position}
        disableScreenReaderOutput={disableScreenReaderOutput}
      >
        {children}
      </EuiToolTip>
    );
  }

  const overlayContainer = fullscreenContext?.isFullscreen
    ? fullscreenContext.overlayContainerRef.current ?? undefined
    : undefined;

  const clearOpenTimer = () => {
    if (openTimerRef.current !== undefined) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  };

  const open = () => {
    clearOpenTimer();
    if (delayMs == null || delayMs <= 0) {
      setIsOpen(true);
      return;
    }
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = undefined;
      setIsOpen(true);
    }, delayMs);
  };

  const close = () => {
    clearOpenTimer();
    setIsOpen(false);
  };

  return (
    <EuiPopover
      button={cloneElement(children, {
        onMouseEnter: (event: React.MouseEvent) => {
          open();
          children.props.onMouseEnter?.(event);
        },
        onMouseLeave: (event: React.MouseEvent) => {
          close();
          children.props.onMouseLeave?.(event);
        },
        onFocus: (event: React.FocusEvent) => {
          // Keyboard focus should still reveal the legend without the long hold.
          clearOpenTimer();
          setIsOpen(true);
          children.props.onFocus?.(event);
        },
        onBlur: (event: React.FocusEvent) => {
          close();
          children.props.onBlur?.(event);
        },
      })}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition={TOOLTIP_TO_POPOVER_POSITION[position]}
      container={overlayContainer}
      panelPaddingSize="s"
      closePopoverOnScroll={false}
      panelProps={{
        onMouseEnter: () => {
          clearOpenTimer();
          setIsOpen(true);
        },
        onMouseLeave: close,
      }}
    >
      {content}
    </EuiPopover>
  );
};
