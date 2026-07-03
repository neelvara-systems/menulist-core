'use client';

import type { MouseEvent } from 'react';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

const TRACK_BEFORE_NAVIGATE_TIMEOUT_MS = 800;

type TrackBeforeNavigateReason = 'alternate_open' | 'target_blank' | 'same_tab';

const getTrackBeforeNavigateFailureContext = (
  href: string,
  target: string | undefined,
  reason: TrackBeforeNavigateReason,
) => ({
  reason,
  targetBlank: target === '_blank',
  ...getBoundedAnalyticsStringContext('href', href),
  ...getBoundedAnalyticsStringContext('target', target),
});

const logTrackBeforeNavigateFailure = (
  error: unknown,
  href: string,
  target: string | undefined,
  reason: TrackBeforeNavigateReason,
) => {
  logAnalyticsFailure(
    'public_link_navigation_tracking_failed',
    error,
    getTrackBeforeNavigateFailureContext(href, target, reason),
  );
};

const waitForTracking = async (
  track: () => Promise<void>,
  onFailure: (error: unknown) => void,
) => {
  await Promise.race([
    Promise.resolve()
      .then(track)
      .catch(onFailure),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, TRACK_BEFORE_NAVIGATE_TIMEOUT_MS);
    }),
  ]);
};

interface TrackBeforeNavigateOptions {
  event: MouseEvent<HTMLAnchorElement>;
  href: string;
  target?: string;
  track: () => Promise<void>;
}

export function trackBeforeNavigate({
  event,
  href,
  target,
  track,
}: TrackBeforeNavigateOptions) {
  if (event.defaultPrevented) return;

  // Preserve browser-native alternate open behavior. These paths may still
  // undercount, but they should not break expected link gestures.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    void waitForTracking(track, (error) => {
      logTrackBeforeNavigateFailure(error, href, target, 'alternate_open');
    });
    return;
  }

  if (target === '_blank') {
    void waitForTracking(track, (error) => {
      logTrackBeforeNavigateFailure(error, href, target, 'target_blank');
    });
    return;
  }

  event.preventDefault();

  void (async () => {
    await waitForTracking(track, (error) => {
      logTrackBeforeNavigateFailure(error, href, target, 'same_tab');
    });
    window.location.assign(href);
  })();
}
