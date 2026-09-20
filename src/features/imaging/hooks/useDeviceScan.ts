import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { imagingDevice } from '../services/imagingDevice';
import {
  DeviceUnavailableError,
  type DeviceInfo,
  type DeviceLaunchInput,
  type DeviceScanInput,
  type DeviceScanResult,
  type DeviceScanStatus,
} from '../types';
import { errMsg } from '../utils/errorMessage';

// While unavailable, how often (and how long) to quietly re-check in the
// background instead of requiring a manual "Recheck" click.
const AUTO_RECHECK_INTERVAL_MS = 2500;
const AUTO_RECHECK_MAX_ATTEMPTS = 60; // ~2.5 minutes

/**
 * Device-scan state machine over the `imagingDevice` boundary, with runtime
 * agent detection. Probes status on mount (and on `refresh`); auto-retries
 * silently in the background whenever unavailable (see the effect below);
 * `launch` deep-links the vendor software to the patient; `runScan` drives
 * the capture (pushed over the agent's websocket when available, polled
 * over HTTP otherwise — see `imagingDevice.runScan`) and returns the
 * captured File (or null on failure/unavailable) for the caller to upload —
 * keeping scan and manual-upload persistence on a single path.
 */
export const useDeviceScan = () => {
  const [status, setStatus] = useState<DeviceScanStatus>('detecting');
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (isMountedRef.current) setStatus('detecting');
    try {
      const result = await imagingDevice.checkStatus();
      if (!isMountedRef.current) return;
      setStatus(result.status);
      setInfo(result.info);
    } catch {
      if (isMountedRef.current) {
        setStatus('error');
        setInfo(null);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();
    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  // Self-heals out of "unavailable" without a manual Recheck click — covers
  // both "just finished installing, still on this tab" and a slow-booting
  // clinic PC where the agent (auto-started via the installer's Run key)
  // hasn't come up yet by the time this page loads, which would otherwise
  // look exactly like the install didn't stick. Deliberately doesn't flip
  // status to 'detecting' on each attempt — that would flicker the card's
  // spinner every couple of seconds for no reason; it only touches state
  // once the result actually changes. Gives up after a while so a
  // genuinely-uninstalled workstation doesn't poll forever in the background.
  useEffect(() => {
    if (status !== 'unavailable') return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (attempts > AUTO_RECHECK_MAX_ATTEMPTS) {
        clearInterval(id);
        return;
      }
      imagingDevice
        .checkStatus()
        .then((result) => {
          if (!isMountedRef.current || result.status === 'unavailable') return;
          setStatus(result.status);
          setInfo(result.info);
        })
        .catch(() => {
          // still unavailable — keep retrying silently until the cap above
        });
    }, AUTO_RECHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  const launch = useCallback(async (input: DeviceLaunchInput): Promise<boolean> => {
    try {
      await imagingDevice.launchSoftware(input);
      toast.success('Opening imaging software', {
        description: 'The patient was sent to the imaging software.',
      });
      return true;
    } catch (err) {
      toast.error(
        err instanceof DeviceUnavailableError
          ? 'Imaging device not available'
          : 'Could not open imaging software',
        {
          description:
            err instanceof DeviceUnavailableError
              ? 'No imaging agent is running on this workstation.'
              : errMsg(err) || (err instanceof Error ? err.message : 'Please try again.'),
        },
      );
      return false;
    }
  }, []);

  const runScan = useCallback(
    async (input: DeviceScanInput): Promise<DeviceScanResult | null> => {
      setIsScanning(true);
      setStatus('scanning');
      try {
        const result = await imagingDevice.runScan(input);
        if (isMountedRef.current) setStatus('idle');
        return result;
      } catch (err) {
        if (isMountedRef.current) {
          setStatus(err instanceof DeviceUnavailableError ? 'unavailable' : 'error');
        }
        toast.error(
          err instanceof DeviceUnavailableError
            ? 'Imaging device not available'
            : 'Scan failed',
          {
            description:
              err instanceof DeviceUnavailableError
                ? 'No imaging bridge is configured on this workstation.'
                : errMsg(err) || (err instanceof Error ? err.message : 'Please try again.'),
          },
        );
        return null;
      } finally {
        if (isMountedRef.current) setIsScanning(false);
      }
    },
    [],
  );

  return { status, info, isScanning, runScan, launch, refresh };
};
