// Client-side persistence for the AppointNow simulation.
//
// The DentC backend has no public online-booking resource yet (see
// docs/appointnow/appointnow_backend_devreport.md). Until it does, booking
// requests live in localStorage — SHARED across users of the browser, because
// the simulated "backend" is a single shared store (unlike per-user messaging).
// This file is the single swap point: when the real backend lands,
// realTransport.ts replaces these reads.
//
// Key convention (matches messagingStorage / lastPatientStorage):
//   dentc:appointnow:<bucket>

import type { BookingRequest } from "../transport/types";

const NS = "dentc:appointnow";

function bucketKey(bucket: string): string {
  return `${NS}:${bucket}`;
}

function read<T>(bucket: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(bucketKey(bucket));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(bucket: string, value: T): void {
  try {
    localStorage.setItem(bucketKey(bucket), JSON.stringify(value));
  } catch {
    /* quota / disabled storage — non-fatal, state simply won't persist */
  }
}

// ---------------------------------------------------------------------------
// Booking requests (the shared intake queue)
// ---------------------------------------------------------------------------

export function loadRequests(): BookingRequest[] {
  return read<BookingRequest[]>("requests", []);
}

export function saveRequests(requests: BookingRequest[]): void {
  write("requests", requests);
}

/** Insert or replace a request by id, newest-first. */
export function upsertRequest(request: BookingRequest): BookingRequest[] {
  const rest = loadRequests().filter((r) => r.id !== request.id);
  const next = [request, ...rest].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || ""),
  );
  saveRequests(next);
  return next;
}
