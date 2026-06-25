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

/**
 * Device-scan state machine over the `imagingDevice` boundary, with runtime
 * agent detection. Probes status on mount (and on `refresh`); `launch` deep-links
 * the vendor software to the patient; `runScan` drives start → poll and returns
 * the captured File (or null on failure/unavailable) for the caller to upload —
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

  return { status, info, isScanning, runScan, launch, refresh };
};
