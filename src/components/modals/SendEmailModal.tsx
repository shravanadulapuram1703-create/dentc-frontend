import { X, Link as LinkIcon, Undo, Redo } from 'lucide-react';
import { useState } from 'react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientEmail: string;
  patientName: string;
}

export default function SendEmailModal({ isOpen, onClose, patientEmail, patientName }: SendEmailModalProps) {
  const [emailData, setEmailData] = useState({
    to: patientEmail,
    subject: 'Appointment Confirmation',
    body: ''
  });

  const handleAddRegistrationLink = () => {
    const registrationLink = `\n\n[Patient Portal Registration Link: https://portal.example.com/register?token=ABC123]\n\n`;
    setEmailData({ ...emailData, body: emailData.body + registrationLink });
  };

  const handleSend = () => {
    // Log communication
    console.log('Email sent:', emailData);
    alert('Email sent successfully and logged to patient communications history.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl border-2 border-[#E2E8F0]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between border-b-2 border-[#162942]">
          <h2 className="font-bold text-white">SEND EMAIL</h2>
          <button onClick={onClose} className="text-white hover:bg-[#162942] p-2 rounded transition-colors">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* To Email */}
          <div>
            <label className="block text-[#1E293B] font-medium mb-1">
              To Email Address <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="email"
              value={emailData.to}
              onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[#1E293B] font-medium mb-1">
              Subject <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
            />
          </div>

          {/* Body with Toolbar */}
          <div>
            <label className="block text-[#1E293B] font-medium mb-1">
              Body <span className="text-[#EF4444]">*</span>
            </label>
            
            {/* Rich Text Toolbar */}
            <div className="border-2 border-[#CBD5E1] rounded-t-lg bg-[#F7F9FC] p-2 flex items-center gap-2 flex-wrap">
              <select className="px-2 py-1 border border-[#CBD5E1] rounded text-sm">
                <option>Arial</option>
                <option>Times New Roman</option>
                <option>Courier</option>
                <option>Verdana</option>
              </select>
              <select className="px-2 py-1 border border-[#CBD5E1] rounded text-sm">
                <option>12</option>
                <option>14</option>
                <option>16</option>
                <option>18</option>
                <option>20</option>
              </select>
              <div className="border-l-2 border-[#CBD5E1] h-6 mx-1"></div>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded font-bold" title="Bold">B</button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded italic" title="Italic">I</button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded underline" title="Underline">U</button>
              <div className="border-l-2 border-[#CBD5E1] h-6 mx-1"></div>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded" title="Align Left">⇤</button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded" title="Center">≡</button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded" title="Align Right">⇥</button>
              <div className="border-l-2 border-[#CBD5E1] h-6 mx-1"></div>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded" title="Bulleted List">• List</button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded" title="Numbered List">1. List</button>
              <div className="border-l-2 border-[#CBD5E1] h-6 mx-1"></div>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded flex items-center gap-1" title="Insert Link">
                <LinkIcon className="w-4 h-4" />
              </button>
              <div className="border-l-2 border-[#CBD5E1] h-6 mx-1"></div>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded flex items-center gap-1" title="Undo">
                <Undo className="w-4 h-4" />
              </button>
              <button className="px-2 py-1 hover:bg-[#E2E8F0] rounded flex items-center gap-1" title="Redo">
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* Text Area */}
            <textarea
              value={emailData.body}
              onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
              rows={10}
              className="w-full px-3 py-2 border-2 border-t-0 border-[#CBD5E1] rounded-b-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
              placeholder="Type your message here..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t-2 border-[#E2E8F0]">
            <button
              onClick={handleAddRegistrationLink}
              className="bg-[#2FB9A7] text-white px-4 py-2 rounded-lg hover:bg-[#26a396] transition-colors flex items-center gap-2"
            >
              + Add Patient Registration Link
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-6 py-2 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={handleSend}
                className="bg-[#3A6EA5] text-white px-6 py-2 rounded-lg hover:bg-[#1F3A5F] transition-colors font-medium shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
