import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { ActivityEvent } from "../types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

function formatEvent(e: ActivityEvent): string {
  const from = e.fromStatus ? STATUS_LABEL[e.fromStatus] : "—";
  const to = STATUS_LABEL[e.toStatus];
  return `${e.actorName} moved Task #${e.taskNumber} from ${from} → ${to}`;
}

// If `projectId` is given, this renders the feed for that single project
// page and joins its socket room for live updates while mounted. If
// omitted, it renders the caller's role-scoped global feed (admin: all
// projects, PM: their projects, developer: their tasks) — the backend
// applies that scoping, this component just reflects it.
export default function ActivityFeed({ projectId }: { projectId?: string }) {
  const socket = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = projectId ? `?projectId=${projectId}` : "";
    api
      .get<{ feed: ActivityEvent[] }>(`/api/activity${qs}`)
      .then((d) => setEvents(d.feed))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    if (projectId) {
      socket.emit("project:join", projectId);
    }

    const handler = (e: ActivityEvent) => {
      if (projectId && e.projectId !== projectId) return;
      setEvents((prev) => [e, ...prev].slice(0, 50));
    };
    socket.on("activity:new", handler);

    return () => {
      socket.off("activity:new", handler);
      if (projectId) socket.emit("project:leave", projectId);
    };
  }, [socket, projectId]);

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity Feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
        {loading && <p className="px-4 py-6 text-sm text-slate-400">Loading feed…</p>}
        {!loading && events.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">No activity yet.</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="px-4 py-3 text-sm">
            <p className="text-slate-800">
              {formatEvent(e)}
              {!projectId && <span className="text-slate-400"> · {e.projectName}</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{timeAgo(e.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
