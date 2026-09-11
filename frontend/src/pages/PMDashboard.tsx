import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ActivityFeed from "../components/ActivityFeed";
import { Project, Task } from "../types";

interface PmStats {
  projects: Project[];
  tasksByPriority: Record<string, number>;
  upcomingDueDates: Task[];
}

export default function PMDashboard() {
  const [stats, setStats] = useState<PmStats | null>(null);

  useEffect(() => {
    api.get<PmStats>("/api/dashboard").then(setStats);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">My Projects</h3>
          </div>
          <div className="space-y-2">
            {stats?.projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.client?.name}</p>
                </div>
                <span className="text-xs text-slate-400">{p._count?.tasks ?? 0} tasks</span>
              </Link>
            ))}
            {stats?.projects.length === 0 && <p className="text-sm text-slate-400">No projects yet.</p>}
          </div>
        </div>

        {stats && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold mb-3">Tasks by Priority</h3>
            <div className="grid grid-cols-4 gap-3">
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                <div key={p} className="text-center bg-slate-50 rounded-md py-3">
                  <div className="text-xl font-semibold">{stats.tasksByPriority[p] ?? 0}</div>
                  <div className="text-xs text-slate-500">{p}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold mb-3">Upcoming Due Dates (7 days)</h3>
          <div className="space-y-2">
            {stats?.upcomingDueDates.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm px-3 py-2 bg-slate-50 rounded-md">
                <span>
                  #{t.number} {t.title} — {t.assignedTo?.name}
                </span>
                <span className="text-xs text-slate-500">
                  {t.dueDate && new Date(t.dueDate).toLocaleDateString()}
                </span>
              </div>
            ))}
            {stats?.upcomingDueDates.length === 0 && (
              <p className="text-sm text-slate-400">Nothing due in the next 7 days.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <ActivityFeed />
      </div>
    </div>
  );
}
