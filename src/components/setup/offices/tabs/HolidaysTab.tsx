import { Calendar, Plus, Trash2, Copy } from "lucide-react";
import {useEffect,  useState } from "react";
import api from "../../../../services/api";
import { type Office } from "../../../../data/officeData";



interface OfficeOption {
  id: string;
  officeName: string;
}

interface Holiday {
  id: string;
  officeId: Number;
  name: string;
  fromDate: string;
  toDate: string;
  is_active?: boolean;
}


interface HolidayApi {
  id: string;
  officeId: Number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface HolidaysTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}


/* ---------------- MAPPER ---------------- */

const mapHolidayApiToUI = (h: HolidayApi): Holiday => ({
  id: h.id,
  officeId: h.officeId,
  name: h.name,
  fromDate: h.start_date,
  toDate: h.end_date,
  is_active: h.is_active,
});



export default function HolidaysTab({
  formData,
  updateFormData,
}: HolidaysTabProps) {
  const holidays: any[] = formData.holidays || [];
  
  const [newHoliday, setNewHoliday] = useState({
    name: "",
    fromDate: "",
    toDate: "",
  });


  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  const [sourceOfficeId, setSourceOfficeId] = useState("");
  const [copyMode, setCopyMode] = useState<"append" | "overwrite">("append");
  const [loadingCopy, setLoadingCopy] = useState(false);

  /* ---------------- LOAD OFFICES ---------------- */

  useEffect(() => {
    const loadOffices = async () => {
      try {
        setLoadingOffices(true);

        const res = await api.get("/api/v1/offices");

        setOffices(
          res.data.filter(
            (o: any) => (o.officeId || o.id) !== formData.officeId
          )
        );
      } catch (err) {
        console.error("Failed to load offices", err);
      } finally {
        setLoadingOffices(false);
      }
    };

    if (formData.officeId) {
      loadOffices();
    }
  }, [formData.officeId]);

  /* ---------------- FETCH HOLIDAYS FROM OFFICE ---------------- */

  const fetchOfficeHolidays = async (officeId: number): Promise<Holiday[]> => {
    const res = await api.get(`/api/v1/offices/${officeId}/setup`);
    return (res.data.holidays ?? []).map(mapHolidayApiToUI);
  };


  /* -------------------- ADD -------------------- */
  // const handleAddHoliday = () => {
  //   if (!newHoliday.name || !newHoliday.fromDate || !newHoliday.toDate) {
  //     alert("Please fill in all holiday fields");
  //     return;
  //   }

  //   if (newHoliday.fromDate > newHoliday.toDate) {
  //     alert("From date cannot be after To date");
  //     return;
  //   }

  //   const tempHoliday: Holiday = {
  //     id: `temp-${Date.now()}`, // replaced by backend
  //     name: newHoliday.name.trim(),
  //     fromDate: newHoliday.fromDate,
  //     toDate: newHoliday.toDate,
  //     is_active: true,
  //   };

  //   updateFormData({
  //     holidays: [...holidays, tempHoliday],
  //   });

  //   setNewHoliday({ name: "", fromDate: "", toDate: "" });
  // };



  /* -------------------- DELETE (SOFT) -------------------- */
  // const handleDeleteHoliday = (holidayId: string) => {
  //   if (!confirm("Are you sure you want to delete this holiday?")) return;

  //   updateFormData({
  //     holidays: holidays.filter((h) => h.id !== holidayId),
  //   });
  // };

  // const handleCopyHolidays = async () => {
  //   if (!sourceOfficeId) {
  //     alert("Please select an office to copy from");
  //     return;
  //   }

  //   try {
  //     setLoadingCopy(true);

  //     const sourceHolidays = await fetchOfficeHolidays(sourceOfficeId);

  //     if (sourceHolidays.length === 0) {
  //       alert("Selected office has no holidays");
  //       return;
  //     }

  //     // Remove ids so backend treats them as new
  //     const clonedHolidays: Holiday[] = sourceHolidays.map((h) => ({
  //       ...h,
  //       id: `temp-${Date.now()}-${Math.random()}`, // temporary frontend id
  //     }));

  //     updateFormData({
  //       holidays:
  //         copyMode === "overwrite"
  //           ? clonedHolidays
  //           : [...holidays, ...clonedHolidays],
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to copy holidays");
  //   } finally {
  //     setLoadingCopy(false);
  //   }
  // };

  /* ---------------- ADD ---------------- */

  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.fromDate || !newHoliday.toDate) {
      alert("Please fill in all holiday fields");
      return;
    }

    if (newHoliday.fromDate > newHoliday.toDate) {
      alert("From date cannot be after To date");
      return;
    }

    updateFormData({
      holidays: [
        ...holidays,
        {
          id: `temp-${Date.now()}`,
          name: newHoliday.name.trim(),
          fromDate: newHoliday.fromDate,
          toDate: newHoliday.toDate,
          officeId: formData.officeId ? Number(formData.officeId) : 0,
        },
      ],
    });

    setNewHoliday({ name: "", fromDate: "", toDate: "" });
  };

  /* ---------------- DELETE ---------------- */

  const handleDeleteHoliday = (id: string) => {
    if (!confirm("Delete this holiday?")) return;
    updateFormData({ holidays: holidays.filter((h) => h.id !== id) });
  };

  /* ---------------- COPY ---------------- */

  const handleCopyHolidays = async () => {
    if (!sourceOfficeId) return;

    try {
      setLoadingCopy(true);

      const sourceHolidays = await fetchOfficeHolidays(Number(sourceOfficeId));

      if (sourceHolidays.length === 0) {
        alert("Selected office has no holidays");
        return;
      }

      const cloned = sourceHolidays.map((h) => ({
        ...h,
        id: `temp-${Date.now()}-${Math.random()}`,
      }));

      updateFormData({
        holidays:
          copyMode === "overwrite"
            ? cloned
            : [...holidays, ...cloned],
      });
    } catch (err) {
      console.error(err);
      alert("Failed to copy holidays");
    } finally {
      setLoadingCopy(false);
    }
  };



  /* -------------------- JSX BELOW REMAINS IDENTICAL -------------------- */


  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Holiday Management:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Defines office closure dates</li>
            <li>Scheduler blocks appointments on holidays</li>
            <li>Can copy holidays from another office</li>
            <li>Supports date ranges for multi-day closures</li>
          </ul>
        </div>
      </div>

      {/* Add Holiday */}
      <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">Add New Holiday</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Holiday Name
            </label>
            <input
              type="text"
              value={newHoliday.name}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, name: e.target.value })
              }
              placeholder="e.g., New Year's Day"
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={newHoliday.fromDate}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, fromDate: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={newHoliday.toDate}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, toDate: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleAddHoliday}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      {/* Copy Options */}
      <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">
          Copy Holidays from Another Office
        </h3>
        <div className="flex gap-3">
          {/* <select className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Select office to copy from</option>
            <option value="off-001">Main Street Dental</option>
            <option value="off-002">Downtown Dental Center</option>
          </select> */}
          <select
            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={sourceOfficeId}
            onChange={(e) => setSourceOfficeId(e.target.value)}
            disabled={loadingOffices}
          >
            <option value="">
              {loadingOffices ? "Loading offices..." : "Select office to copy from"}
            </option>

            {offices.map((office) => (
              <option key={office.id} value={(office as any).officeId || office.id}>
                {office.officeName} 
                {/* ({office.shortId}) */}
              </option>
            ))}
          </select>


          {/* <select className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="append">Append</option>
            <option value="overwrite">Overwrite</option>
          </select> */}

          <select
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={copyMode}
            onChange={(e) => setCopyMode(e.target.value as "append" | "overwrite")}
          >
            <option value="append">Append</option>
            <option value="overwrite">Overwrite</option>
          </select>



          {/* <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy
          </button> */}

          <button
            onClick={handleCopyHolidays}
            disabled={!sourceOfficeId || loadingCopy}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            {loadingCopy ? "Copying..." : "Copy"}
          </button>


        </div>
        <p className="text-xs text-slate-500 mt-2">
          Append: Add to existing holidays • Overwrite: Replace all holidays
        </p>
      </div>

      {/* Holiday List */}
      <div>
        <h3 className="font-bold text-slate-900 mb-3">
          Holidays ({holidays.length})
        </h3>

        {holidays.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No holidays defined</p>
            <p className="text-sm text-slate-500 mt-1">
              Add holidays to block scheduler availability
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{holiday.name}</p>
                  <p className="text-sm text-slate-600">
                    {new Date(holiday.fromDate).toLocaleDateString()} -{" "}
                    {new Date(holiday.toDate).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete holiday"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
