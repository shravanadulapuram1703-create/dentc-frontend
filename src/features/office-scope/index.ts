export { OfficeScopeProvider, useOfficeScope, OFFICE_CHANGED_EVENT, type OfficeScope } from "./OfficeScopeContext";
export {
  deriveOfficeAccess,
  deriveOfficeScopeStatus,
  isMembershipRestricted,
  isOfficeAllowed,
  isPrivilegedRole,
  officeKey,
  officeKeyToId,
  resolveInitialOffice,
  LEGACY_PERMISSION_OTHER_OFFICE,
  OFFICE_ASSIGNMENT_ENFORCED,
  PERMISSION_VIEW_ALL_OFFICES,
  PRIVILEGED_ROLES,
  type OfficeAccess,
  type OfficeScopeStatus,
} from "./officeScopeModel";
export {
  clearTabOffice,
  getLastOffice,
  getTabOffice,
  officeScopeKeys,
  setLastOffice,
  setTabOffice,
} from "./officeScopeStorage";
export {
  allOfficesParam,
  homeOfficeFilter,
  officeFilter,
  OfficeRequiredError,
  requireOfficeId,
} from "./officeParams";
export { OFFICE_HEADER, getActiveOfficeId, setActiveOfficeId } from "./officeHeader";
export { STAMP, resolveStamp, type StampContext, type StampKind, type StampSource } from "./stampPolicy";
export {
  collectDirtyLabels,
  confirmDiscardUnsaved,
  registerUnsavedGuard,
  useUnsavedGuard,
} from "./useUnsavedGuard";
export { invalidateOfficeOptions, officeOptionsKeys, useOfficeOptions } from "./useOfficeOptions";
export { OfficeBadge } from "./OfficeBadge";
export {
  deriveReadScope,
  isReadScopeMode,
  readScopeStorageKey,
  useReadScope,
  widestReadScope,
  READ_SCOPE_LABELS,
  READ_SCOPE_STORAGE_PREFIX,
  type ReadScope,
  type ReadScopeAllow,
  type ReadScopeInput,
  type ReadScopeMode,
  type ReadScopeOptions,
  type ResolvedReadScope,
} from "./useReadScope";
export { ScopeToggle } from "./ScopeToggle";
export { ProviderOptionGroups, type GroupableProvider } from "./ProviderOptionGroups";
export { OfficeRequiredBanner, OfficeUnassignedBanner } from "./OfficeRequiredBanner";
export { usePatientOffice, type PatientOffice, type PatientOfficeContext } from "./usePatientOffice";
