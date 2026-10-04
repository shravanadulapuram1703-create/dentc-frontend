// Take (camera) or upload a patient's profile photo. Works with a desktop
// webcam, and with the front/rear cameras on an iPad or Android tablet.
//
// Live camera needs a secure context (https or localhost). When the browser
// can't open it — e.g. a tablet on plain-http LAN — "Use device camera" falls
// back to <input capture>, which opens the tablet's native camera app.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImageUp, Loader2, RefreshCw, SwitchCamera, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGetPatientQueryKey } from "@/api/generated/endpoints/patients/patients";
import { documentErrorMessage } from "@/features/patient-notes/noteDocumentsService";
import {
  removePatientPhoto,
  savePatientPhoto,
  toSquareJpeg,
  usePatientPhotoUrl,
} from "./patientPhotoService";

type Mode = "camera" | "upload";
type Facing = "user" | "environment";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

function isTouchDevice(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow the camera for this site in the browser settings, or use Upload.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is in use by another application.";
  return "The camera couldn't be started.";
}

export default function PatientPhotoDialog({
  open,
  onOpenChange,
  patient_id,
  office_id,
  photo_document_id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient_id: number;
  /** Office the photo document is stamped with (STAMP.document = posting). */
  office_id: number | null;
  photo_document_id: number | null | undefined;
}) {
  const queryClient = useQueryClient();
  const current = usePatientPhotoUrl(photo_document_id);
  const live_camera_supported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const [mode, setMode] = useState<Mode>(live_camera_supported ? "camera" : "upload");
  const [facing, setFacing] = useState<Facing>(isTouchDevice() ? "environment" : "user");
  const [camera_count, setCameraCount] = useState(0);
  const [camera_error, setCameraError] = useState<string | null>(null);
  const [camera_ready, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [captured_url, setCapturedUrl] = useState("");
  const [busy, setBusy] = useState<"save" | "remove" | "process" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const video_ref = useRef<HTMLVideoElement | null>(null);
  const stream_ref = useRef<MediaStream | null>(null);
  const file_ref = useRef<HTMLInputElement | null>(null);
  const native_camera_ref = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback(() => {
    stream_ref.current?.getTracks().forEach((t) => t.stop());
    stream_ref.current = null;
    setCameraReady(false);
  }, []);

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setMode(live_camera_supported ? "camera" : "upload");
    setCaptured(null);
    setError(null);
    setCameraError(null);
  }, [open, live_camera_supported]);

  // Preview URL for the captured / chosen image.
  useEffect(() => {
    if (!captured) {
      setCapturedUrl("");
      return;
    }
    const url = URL.createObjectURL(captured);
    setCapturedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captured]);

  // Live camera: runs only while the dialog is open, in camera mode, with no
  // photo captured yet. Restarts when the facing camera is switched.
  useEffect(() => {
    if (!open || mode !== "camera" || captured || !live_camera_supported) return;
    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream_ref.current = stream;
        const video = video_ref.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        // Labels / counts are only reliable once permission is granted.
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) setCameraCount(devices.filter((d) => d.kind === "videoinput").length);
      })
      .catch((err) => {
        if (!cancelled) setCameraError(cameraErrorMessage(err));
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, mode, captured, facing, live_camera_supported, stopStream]);

  const capture = async () => {
    const video = video_ref.current;
    if (!video) return;
    setBusy("process");
    setError(null);
    try {
      setCaptured(await toSquareJpeg(video));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't capture the photo.");
    } finally {
      setBusy(null);
    }
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.type && !file.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG, HEIC, …).");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That image is larger than 25 MB.");
      return;
    }
    setBusy("process");
    try {
      setCaptured(await toSquareJpeg(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file couldn't be read as an image.");
    } finally {
      setBusy(null);
    }
  };

  const afterPatientChange = (patient: Awaited<ReturnType<typeof savePatientPhoto>>) => {
    queryClient.setQueryData(getGetPatientQueryKey(patient_id), patient);
    queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patient_id) });
    queryClient.invalidateQueries({ queryKey: ["/api/v1/patient-documents"], exact: false });
  };

  const save = async () => {
    if (!captured) return;
    setBusy("save");
    setError(null);
    try {
      afterPatientChange(await savePatientPhoto({ patient_id, office_id, image: captured }));
      toast.success("Patient photo saved");
      onOpenChange(false);
    } catch (err) {
      setError(documentErrorMessage(err, "Couldn't save the photo. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    setError(null);
    try {
      afterPatientChange(await removePatientPhoto(patient_id));
      toast.success("Patient photo removed");
      onOpenChange(false);
    } catch (err) {
      setError(documentErrorMessage(err, "Couldn't remove the photo. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setCaptured(null);
    setError(null);
  };

  const tabClass = (active: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy === "save" || busy === "remove") return;
        if (!next) stopStream();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Patient Photo</DialogTitle>
          <DialogDescription>
            Take a picture with this device's camera, or upload an existing image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button type="button" className={tabClass(mode === "camera")} onClick={() => switchMode("camera")}>
            <Camera className="h-4 w-4" /> Take Photo
          </button>
          <button type="button" className={tabClass(mode === "upload")} onClick={() => switchMode("upload")}>
            <ImageUp className="h-4 w-4" /> Upload
          </button>
        </div>

        {/* Square stage: live camera, captured/chosen preview, or the current photo. */}
        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-900">
          {captured_url ? (
            <img src={captured_url} alt="New patient photo" className="h-full w-full object-cover" />
          ) : mode === "camera" && live_camera_supported && !camera_error ? (
            <>
              <video
                ref={video_ref}
                playsInline
                muted
                autoPlay
                onLoadedData={() => setCameraReady(true)}
                className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
              />
              {/* Face guide */}
              <div className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-dashed border-white/60" />
              {!camera_ready && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting camera…
                </div>
              )}
            </>
          ) : mode === "camera" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 p-5 text-center">
              <Camera className="h-10 w-10 text-slate-400" />
              <p className="text-sm text-slate-600">
                {camera_error ?? "Live camera isn't available in this browser."}
              </p>
              <button
                type="button"
                onClick={() => native_camera_ref.current?.click()}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Use device camera
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => file_ref.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              {current.src ? (
                <img src={current.src} alt="Current patient photo" className="h-full w-full object-cover opacity-60" />
              ) : (
                <>
                  <User className="h-14 w-14 text-slate-300" />
                  <span className="text-sm font-semibold">Click to choose an image</span>
                  <span className="text-xs text-slate-500">JPG, PNG, HEIC/WEBP — cropped to a square</span>
                </>
              )}
            </button>
          )}
          {busy === "process" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>

        <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />
        <input
          ref={native_camera_ref}
          type="file"
          accept="image/*"
          capture={facing}
          className="hidden"
          onChange={onFileChosen}
        />

        {/* Stage actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {captured ? (
            <button
              type="button"
              onClick={() => setCaptured(null)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> {mode === "camera" ? "Retake" : "Choose another"}
            </button>
          ) : mode === "camera" && live_camera_supported && !camera_error ? (
            <>
              <button
                type="button"
                onClick={capture}
                disabled={!camera_ready || busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Capture
              </button>
              {camera_count > 1 && (
                <button
                  type="button"
                  onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  disabled={busy !== null}
                  title="Switch between front and rear camera"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <SwitchCamera className="h-4 w-4" /> Switch
                </button>
              )}
            </>
          ) : mode === "upload" ? (
            <button
              type="button"
              onClick={() => file_ref.current?.click()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ImageUp className="h-4 w-4" /> Choose image
            </button>
          ) : null}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between">
          {photo_document_id != null ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove photo
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                stopStream();
                onOpenChange(false);
              }}
              disabled={busy === "save" || busy === "remove"}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!captured || busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Photo
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
