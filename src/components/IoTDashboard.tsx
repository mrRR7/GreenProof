import React, { useEffect, useState, useRef } from "react";
import { Activity, Zap, Droplet, Trash2, Wifi, WifiOff } from "lucide-react";
import { pythonApi, FacilityReading, IoTSummary } from "../services/pythonApiService";

// ── Helpers ────────────────────────────────────────────────────────────────────

function MetricRow({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="font-semibold text-slate-800 text-sm">
        {value.toLocaleString()} {unit}
      </span>
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        online
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
      />
      {online ? "Live" : "Offline"}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  /** Called each time data refreshes — parent can store the summary. */
  onDataUpdate?: (summary: IoTSummary) => void;
}

export function IoTDashboard({ onDataUpdate }: Props) {
  const [facilities, setFacilities] = useState<FacilityReading[]>([]);
  const [summary, setSummary]       = useState<IoTSummary | null>(null);
  const [connected, setConnected]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const data = await pythonApi.getIoTCurrent();
      setFacilities(data.facilities);
      setSummary(data.summary);
      setConnected(true);
      setLastUpdated(new Date());
      onDataUpdate?.(data.summary);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          {connected ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          Live IoT Sensors
        </h3>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <StatusBadge online={connected} />
        </div>
      </div>

      {/* Fleet summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <div className="text-xs text-red-500 font-medium">Total CO₂</div>
            <div className="text-xl font-bold text-red-700">
              {summary.total_co2_kg_per_hour.toFixed(0)}
              <span className="text-sm font-normal ml-1">kg/hr</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
            <div className="text-xs text-yellow-600 font-medium">Total Energy</div>
            <div className="text-xl font-bold text-yellow-700">
              {summary.total_energy_kwh.toFixed(0)}
              <span className="text-sm font-normal ml-1">kWh</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="text-xs text-blue-500 font-medium">Total Water</div>
            <div className="text-xl font-bold text-blue-700">
              {(summary.total_water_liters / 1000).toFixed(1)}
              <span className="text-sm font-normal ml-1">kL</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-xs text-slate-500 font-medium">Total Waste</div>
            <div className="text-xl font-bold text-slate-700">
              {summary.total_waste_kg.toFixed(0)}
              <span className="text-sm font-normal ml-1">kg</span>
            </div>
          </div>
        </div>
      )}

      {/* Per-facility cards */}
      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ Cannot reach backend at localhost:8000. Start it with{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">python main.py</code>
        </div>
      )}

      {facilities.map((f) => (
        <div key={f.facility_id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 capitalize">
              {f.facility_id.replace("_", " ")}
            </h4>
            <StatusBadge online={f.status === "online"} />
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow
              icon={<Activity className="w-3.5 h-3.5" />}
              label="CO₂ Emissions"
              value={f.sensors.co2_emissions}
              unit="kg/hr"
              color="text-red-500"
            />
            <MetricRow
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Energy"
              value={f.sensors.energy_consumption}
              unit="kWh"
              color="text-yellow-500"
            />
            <MetricRow
              icon={<Droplet className="w-3.5 h-3.5" />}
              label="Water Usage"
              value={f.sensors.water_usage}
              unit="L"
              color="text-blue-500"
            />
            <MetricRow
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label="Waste"
              value={f.sensors.waste_generated}
              unit="kg"
              color="text-slate-400"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
