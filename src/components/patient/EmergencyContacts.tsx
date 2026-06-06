import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Trash2, Edit2, Plus, Loader2, AlertCircle, X, Save } from 'lucide-react';
import {
  useListPatientEmergencyContacts,
  createPatientEmergencyContact,
  updatePatientEmergencyContact,
  deletePatientEmergencyContact,
} from '@/api/generated/endpoints/patients/patients';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
}
interface OutletContext {
  patient: PatientData;
}

const EMPTY = { name: '', relationship: '', phone: '', email: '' };
const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

export default function EmergencyContacts() {
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();

  const numericPatientId = Number(patientId);
  const validId = Number.isFinite(numericPatientId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const query = useListPatientEmergencyContacts(
    { patient_id: numericPatientId, size: 100 },
    { query: { enabled: validId } },
  );
  const contacts = (query.data?.items ?? []).filter((c) => c.is_active);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/v1/patient-emergency-contacts'] });
  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Name is required.');
      return;
    }
    if (!validId) {
      alert('Missing patient context. Please reopen the patient and try again.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        relationship: form.relationship || null,
        phone: form.phone || null,
        email: form.email || null,
      };
      if (editingId != null) {
        await updatePatientEmergencyContact(editingId, body);
      } else {
        await createPatientEmergencyContact({ patient_id: numericPatientId, ...body });
      }
      resetForm();
      invalidate();
    } catch (err) {
      alert(errMsg(err) || 'Failed to save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this emergency contact?')) return;
    setDeletingId(id);
    try {
      await deletePatientEmergencyContact(id);
      if (editingId === id) resetForm();
      invalidate();
    } catch (err) {
      alert(errMsg(err) || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const field = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Phone className="w-6 h-6 text-rose-700" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
              <p className="text-sm text-slate-600">{patient.name}</p>
            </div>
          </div>
        </div>

        {/* Add / Edit form */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId != null ? 'Edit Contact' : 'Add Contact'}
            </h2>
            {editingId != null && (
              <button
                onClick={resetForm}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={field('name')}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={form.relationship}
                onChange={field('relationship')}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                placeholder="e.g. Spouse, Parent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={field('phone')}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={field('email')}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : editingId != null ? (
                <Save className="w-4 h-4" strokeWidth={2} />
              ) : (
                <Plus className="w-4 h-4" strokeWidth={2} />
              )}
              {saving ? 'Saving…' : editingId != null ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-20">
                  Actions
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-40">
                  Relationship
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-40">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {query.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" strokeWidth={2} />
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" strokeWidth={2} />
                    <button
                      onClick={() => query.refetch()}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-600">
                    <Phone className="w-8 h-8 text-slate-400 mx-auto mb-2" strokeWidth={2} />
                    No emergency contacts yet.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setForm({
                              name: c.name ?? '',
                              relationship: c.relationship ?? '',
                              phone: c.phone ?? '',
                              email: c.email ?? '',
                            });
                            setEditingId(c.id);
                          }}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                          ) : (
                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{c.relationship || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{c.email || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
