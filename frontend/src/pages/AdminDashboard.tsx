import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import ActivityFeed from "../components/ActivityFeed";
import { Project } from "../types";

interface AdminStats {
  totalProjects: number;
  tasksByStatus: Record<string, number>;
  overdueCount: number;
  onlineUsers: number;
}

export default function AdminDashboard() {
  const socket = useSocket();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.get<AdminStats>("/api/dashboard").then(setStats);
    api.get<{ projects: Project[] }>("/api/projects").then((d) => setProjects(d.projects));
  }, []);

  // Live "active users online right now" — pushed via WebSocket presence
  // events, not polled.
  useEffect(() => {
    if (!socket) return;
    const handler = (count: number) => setStats((prev) => (prev ? { ...prev, onlineUsers: count } : prev));
    socket.on("presence:count", handler);
    return () => {
      socket.off("presence:count", handler);
    };
  }, [socket]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Projects" value={stats?.totalProjects ?? "–"} />
          <StatCard label="Overdue Tasks" value={stats?.overdueCount ?? "–"} tone="red" />
          <StatCard label="Online Now" value={stats?.onlineUsers ?? "–"} tone="green" live />
          <StatCard
            label="Tasks Done"
            value={stats?.tasksByStatus?.DONE ?? "–"}
            tone="indigo"
          />
        </div>

        {stats && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold mb-3">Tasks by Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                <div key={status} className="text-center bg-slate-50 rounded-md py-3">
                  <div className="text-xl font-semibold">{count}</div>
                  <div className="text-xs text-slate-500">{status.replace("_", " ")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold mb-3">All Projects</h3>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {p.client?.name} · PM: {p.pm?.name}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{p._count?.tasks ?? 0} tasks</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
  live = false,
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "red" | "green" | "indigo";
  live?: boolean;
}) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-900",
    red: "text-red-600",
    green: "text-emerald-600",
    indigo: "text-indigo-600",
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className={`text-2xl font-semibold ${toneMap[tone]}`}>
        {value}
        {live && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse align-middle" />}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
