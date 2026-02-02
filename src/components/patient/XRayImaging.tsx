import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ImageIcon,
  AlertCircle,
  Info,
  ShieldCheck,
  Server,
} from "lucide-react";
import { components } from "../../styles/theme";
import { toast } from "../ui/sonner";

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  firstName?: string;
  lastName?: string;
}

interface OutletContext {
  patient: PatientData;
}

export default function XRayImaging() {
  const { patient } = useOutletContext<OutletContext>();
  const [connectorStatus, setConnectorStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    checkConnectorHealth();
  }, []);

  const checkConnectorHealth = async () => {
    try {
      const response = await fetch("http://localhost:4567/health", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });

      setConnectorStatus(response.ok ? "online" : "offline");
    } catch {
      setConnectorStatus("offline");
    }
  };

  const handleLaunchVatech = async () => {
    if (connectorStatus === "offline") {
      toast.error("Vatech Imaging Connector not detected", {
        description:
          "Please install the connector on this machine to launch imaging.",
        duration: 4000,
      });
      return;
    }

    try {
      const [firstName, ...lastNameParts] = patient.name.split(" ");
      const lastName = lastNameParts.join(" ");

      const response = await fetch("http://localhost:4567/launch-xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          firstName: firstName || "",
          lastName: lastName || "",
          dob: patient.dob,
        }),
      });

      if (!response.ok) throw new Error();

      toast.success("Vatech Imaging Launched", {
        description: `Opening X-rays for ${patient.name}`,
      });
    } catch {
      toast.error("Failed to launch Vatech Imaging", {
        description: "Please try again or contact support.",
      });
    }
  };

  const handleInstallConnector = () => {
    toast.info("Imaging Connector Required", {
      description:
        "Please contact your IT administrator to install the Vatech Imaging Connector.",
      duration: 5000,
    });
  };

  if (!patient) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#3A6EA5]/10 rounded-lg">
                <ImageIcon className="w-6 h-6 text-[#3A6EA5]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">
                  X-Ray Imaging
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  Vatech Imaging Integration
                </p>
              </div>
            </div>

            {/* Status Badge */}
            {connectorStatus === "checking" && (
              <StatusBadge color="amber" label="CHECKING..." pulse />
            )}
            {connectorStatus === "online" && (
              <StatusBadge color="teal" label="VATECH READY" />
            )}
            {connectorStatus === "offline" && (
              <StatusBadge color="red" label="IMAGING OFFLINE" />
            )}
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-3 gap-4 border-t-2 border-[#E2E8F0] pt-4 mt-4">
            <InfoBlock label="Patient" value={patient.name} />
            <InfoBlock
              label="DOB / Age"
              value={`${patient.dob} (${patient.age}y)`}
            />
            <InfoBlock label="Patient ID" value={patient.id} />
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-8 bg-gradient-to-br from-[#3A6EA5]/10 to-[#2FB9A7]/10 rounded-full">
                <ImageIcon className="w-24 h-24 text-[#3A6EA5]" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#1E293B]">
              X-Ray Imaging System Not Connected
            </h2>

            <p className="text-[#475569]">
              This clinic uses <strong>Vatech Imaging</strong> to capture and view
              patient X-rays.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleLaunchVatech}
                className={`${components.buttonPrimary} inline-flex items-center gap-2`}
              >
                <ImageIcon className="w-4 h-4" />
                Launch Vatech Imaging
              </button>

              <button
                onClick={handleInstallConnector}
                className={`${components.buttonOutline} inline-flex items-center gap-2`}
              >
                <Server className="w-4 h-4" />
                Install Imaging Connector
              </button>
            </div>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#3A6EA5]"
            >
              <Info className="w-4 h-4" />
              About X-Ray Integration
            </button>

            {showInfo && (
              <div className="p-4 bg-[#3A6EA5]/5 border border-[#3A6EA5]/20 rounded-lg text-left">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#3A6EA5]" />
                  <p className="text-sm text-[#475569]">
                    X-ray images are managed by the Vatech desktop imaging system
                    and are not stored inside the PMS.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-6 p-4 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg text-xs">
          <div className="flex gap-3 text-[#64748B]">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-semibold text-[#475569]">
                Technical Information
              </p>
              <p>
                <strong>Connector:</strong> http://localhost:4567
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    connectorStatus === "online"
                      ? "text-[#2FB9A7] font-semibold"
                      : "text-[#EF4444] font-semibold"
                  }
                >
                  {connectorStatus === "online"
                    ? "Connected"
                    : "Not Connected"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helper Components ---------- */

function StatusBadge({
  label,
  color,
  pulse,
}: {
  label: string;
  color: "amber" | "teal" | "red";
  pulse?: boolean;
}) {
  const colors = {
    amber: "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#D97706]",
    teal: "bg-[#2FB9A7]/10 border-[#2FB9A7]/30 text-[#2FB9A7]",
    red: "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#DC2626]",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 border rounded-full ${colors[color]}`}
    >
      <div
        className={`w-2 h-2 rounded-full bg-current ${
          pulse ? "animate-pulse" : ""
        }`}
      />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-[#64748B] uppercase">
        {label}
      </div>
      <div className="font-semibold text-[#1E293B]">{value}</div>
    </div>
  );
}
