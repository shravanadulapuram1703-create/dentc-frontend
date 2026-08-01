import { CalendarCheck, MapPin, Phone } from "lucide-react";
import type { PublicOfficeInfo } from "../transport/types";

/** Branded header for the public booking page. */
export default function OfficeHeader({ office }: { office: PublicOfficeInfo }) {
  return (
    <header className="bg-gradient-to-r from-[#2C5282] to-[#3A6EA5] text-white">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <CalendarCheck className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
              {office.name}
            </h1>
            <p className="text-sm text-white/80">Book an appointment online</p>
          </div>
        </div>
        {(office.phone || office.address) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
            {office.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> {office.phone}
              </span>
            )}
            {office.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {office.address}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
