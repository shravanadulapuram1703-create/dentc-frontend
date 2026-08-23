import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  AlertCircle,
  ScanLine,
  RefreshCw,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import type { DicomImage, DicomImagingFilters } from '../types';
import { useGetPatientImaging } from '../hooks/useDicomImaging';
import { flattenImaging, formatStudyDate, MODALITY_LABELS } from '../utils/dicomAssets';
import DicomFilters from './DicomFilters';
import DicomStudyCard from './DicomStudyCard';
import DicomViewer from './DicomViewer';

interface DicomStudySectionProps {
  patientId: number;
}

/**
 * "Scanned Imaging" — the patient's DICOM archive (migrated PACS scans in cloud
 * storage). Loads the study tree, offers modality/tooth/date filters, groups
 * images by study, and opens a full viewer with a DICOM download.
 */
export default function DicomStudySection({ patientId }: DicomStudySectionProps) {
  const [filters, setFilters] = useState<DicomImagingFilters>({});
  const [viewerUid, setViewerUid] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useGetPatientImaging(
    patientId,
    filters,
  );

  const studies = useMemo(() => data?.studies ?? [], [data]);
  const images = useMemo<DicomImage[]>(() => flattenImaging(data), [data]);

  // Stable modality dropdown: the contract's fixed set, unioned with anything the
  // current response surfaces (server-side filtering can otherwise shrink it).
  const availableModalities = useMemo(() => {
    const set = new Set<string>(Object.keys(MODALITY_LABELS));
    for (const s of studies) (s.modalities ?? []).forEach((m) => set.add(m));
    return Array.from(set);
  }, [studies]);

  const openImage = (image: DicomImage) => setViewerUid(image.instance.sop_instance_uid);

  // Which study sections are expanded. Held here (not per-card) so Expand All /
  // Collapse All can drive every section at once while each header still toggles
  // on its own.
  const [openUids, setOpenUids] = useState<Set<string>>(() => new Set());
  const studyKey = useMemo(
    () => studies.map((s) => s.study_instance_uid).join('|'),
    [studies],
  );

  // Reset to the default (newest study expanded) whenever the study set changes,
  // e.g. after a filter change. Derived from studyKey alone so a plain refetch of
  // the same studies doesn't collapse what the user opened.
  useEffect(() => {
    const first = studyKey ? studyKey.split('|')[0] : null;
    setOpenUids(new Set(first ? [first] : []));
  }, [studyKey]);

  const toggleStudy = useCallback((uid: string) => {
    setOpenUids((prev) => {
      const next = new Set(prev);
      if (!next.delete(uid)) next.add(uid);
      return next;
    });
  }, []);

  const expandAll = () => setOpenUids(new Set(studies.map((s) => s.study_instance_uid)));
  const collapseAll = () => setOpenUids(new Set());

  const openCount = studies.filter((s) => openUids.has(s.study_instance_uid)).length;
  const allExpanded = studies.length > 0 && openCount === studies.length;
  const allCollapsed = openCount === 0;

  const hasActiveFilters =
    Boolean(filters.modality) ||
    filters.tooth != null ||
    Boolean(filters.date_from) ||
    Boolean(filters.date_to);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#3A6EA5]/10 rounded-lg">
            <ScanLine className="w-5 h-5 text-[#3A6EA5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">Scanned Imaging</h2>
            <p className="text-xs text-[#64748B]">
              {data
                ? `${data.study_count} ${data.study_count === 1 ? 'study' : 'studies'} · ${data.image_count} ${
                    data.image_count === 1 ? 'image' : 'images'
                  }${data.latest_study_date ? ` · latest ${formatStudyDate(data.latest_study_date)}` : ''}`
                : 'Radiographs & photos from cloud storage'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-md hover:bg-[#F1F5F9] transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-[#64748B] ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <DicomFilters
        value={filters}
        onChange={setFilters}
        availableModalities={availableModalities}
        disabled={isLoading}
      />

      {/* Body */}
      {isLoading ? (
        <div className="text-center py-14">
          <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#64748B]">Loading imaging…</p>
        </div>
      ) : isError ? (
        <div className="text-center py-14">
          <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#475569] mb-2">Could not load imaging.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-[#3A6EA5] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : studies.length === 0 ? (
        <div className="text-center py-14">
          <div className="inline-flex p-4 bg-[#F1F5F9] rounded-full mb-3">
            <ScanLine className="w-8 h-8 text-[#94A3B8]" />
          </div>
          <p className="text-sm font-semibold text-[#64748B]">
            {hasActiveFilters ? 'No imaging matches these filters' : 'No scanned imaging on file'}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            {hasActiveFilters
              ? 'Try clearing the filters above.'
              : "This patient's radiographs will appear here once migrated to cloud storage."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[#64748B]">
              {openCount} of {studies.length} {studies.length === 1 ? 'section' : 'sections'} expanded
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                disabled={allExpanded}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title="Expand all image sections"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                disabled={allCollapsed}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title="Collapse all image sections"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Collapse All
              </button>
            </div>
          </div>

          {studies.map((study) => (
            <DicomStudyCard
              key={study.study_instance_uid}
              study={study}
              open={openUids.has(study.study_instance_uid)}
              onToggle={toggleStudy}
              onOpen={openImage}
            />
          ))}
        </div>
      )}

      {viewerUid && images.length > 0 && (
        <DicomViewer
          images={images}
          currentUid={viewerUid}
          onSelect={(img) => setViewerUid(img.instance.sop_instance_uid)}
          onClose={() => setViewerUid(null)}
          onRefreshTree={() => refetch()}
        />
      )}
    </div>
  );
}
