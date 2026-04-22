import React, { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive } from "lucide-react";

const API_BASE = "http://localhost:8080/api";

type ProcessStats = {
  cpuPercent: number;
  memoryMb: number;
};

type SystemStats = {
  backend: ProcessStats;
  ollama: ProcessStats;
};

export function StatsDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/ollama/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const totalCpu = Math.round((stats.backend.cpuPercent + stats.ollama.cpuPercent) * 10) / 10;
  const totalMem = stats.backend.memoryMb + stats.ollama.memoryMb;

  return (
    <div className="stats-dashboard">
      <div className="stats-header">
        <Activity size={14} />
        <span>Resource Monitor</span>
      </div>
      
      <div className="stats-grid">
        <div className="stats-item">
          <div className="stats-label">
            <Cpu size={12} />
            <span>CPU</span>
          </div>
          <div className="stats-value">{totalCpu}%</div>
          <div className="stats-bar-bg">
            <div 
              className="stats-bar-fill cpu" 
              style={{ width: `${Math.min(totalCpu, 100)}%` }}
            />
          </div>
          <div className="stats-details">
            App: {stats.backend.cpuPercent}% | Ollama: {stats.ollama.cpuPercent}%
          </div>
        </div>

        <div className="stats-item">
          <div className="stats-label">
            <HardDrive size={12} />
            <span>RAM</span>
          </div>
          <div className="stats-value">{totalMem >= 1024 ? `${(totalMem/1024).toFixed(1)} GB` : `${totalMem} MB`}</div>
          <div className="stats-bar-bg">
            <div 
              className="stats-bar-fill mem" 
              style={{ width: `${Math.min((totalMem / 16384) * 100, 100)}%` }} // 16GB as reference
            />
          </div>
          <div className="stats-details">
            App: {stats.backend.memoryMb}MB | Ollama: {stats.ollama.memoryMb}MB
          </div>
        </div>
      </div>
    </div>
  );
}
