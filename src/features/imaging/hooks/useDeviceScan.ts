import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { imagingDevice } from '../services/imagingDevice';
import {
  DeviceUnavailableError,
  type DeviceScanInput,
  type DeviceScanResult,
  type DeviceScanStatus,
} from '../types';
import { errMsg } from '../utils/errorMessage';

/**
 * Device-scan state machine over the env-gated `imagingDevice` boundary.
 * Polls device status on mount; `runScan` drives start → poll and returns the
 * captured File (or null on failure/unavailable) for the caller to upload —
 * keeping scan and manual-upload persistence on a single path.
 */
export const useDeviceScan = () => {
  const [status, setStatus] = useState<DeviceScanStatus>('unavailable');
  const [isScanning, setIsScanning] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    imagingDevice
      .checkStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, []);

  const runScan = useCallback(
    async (input: DeviceScanInput): Promise<DeviceScanResult | null> => {
      setIsScanning(true);
      setStatus('scanning');
      try {
        const { scan_id } = await imagingDevice.startScan(input);
        const result = await imagingDevice.pollScan(scan_id);
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

  return { status, isScanning, runScan };
};
