import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Task, TaskStatus } from "../types";

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "TODO"],
  IN_REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

interface Props {
  projectId?: string; // when omitted, shows tasks scoped to the caller (e.g. "my tasks")
  onTaskUpdated?: () => void;
}

// Filters are read from and written to URL query params (?status=&priority=&dueBefore=&dueAfter=)
// so any filtered view is a shareable, bookmarkable link — not just local component state.
export default function TaskList({ projectId, onTaskUpdated }: Props) {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const dueBefore = params.get("dueBefore") || "";
  const dueAfter = params.get("dueAfter") || "";

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, status, priority, dueBefore, dueAfter]);

  async function load() {
    setLoading(true);
    const qp = new URLSearchParams();
    if (projectId) qp.set("projectId", projectId);
    if (status) qp.set("status", status);
    if (priority) qp.set("priority", priority);
    if (dueBefore) qp.set("dueBefore", dueBefore);
    if (dueAfter) qp.set("dueAfter", dueAfter);
    try {
      const data = await api.get<{ tasks: Task[] }>(`/api/tasks?${qp.toString()}`);
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function moveTask(taskId: string, next: TaskStatus) {
    await api.patch(`/api/tasks/${taskId}/status`, { status: next });
    await load();
    onTaskUpdated?.();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5"
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueAfter}
          onChange={(e) => updateFilter("dueAfter", e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5"
          title="Due after"
        />
        <input
          type="date"
          value={dueBefore}
          onChange={(e) => updateFilter("dueBefore", e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5"
          title="Due before"
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {!loading && tasks.length === 0 && <p className="text-sm text-slate-400">No tasks match these filters.</p>}

      <div className="space-y-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">#{t.number}</span>
                <span className="font-medium text-sm truncate">{t.title}</span>
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLE[t.priority]}`}>
                  {t.priority}
                </span>
                {t.isOverdue && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t.assignedTo?.name ?? "Unassigned"}
                {t.dueDate && ` · Due ${new Date(t.dueDate).toLocaleDateString()}`}
                {t.project?.name && ` · ${t.project.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded px-2 py-1">
                {t.status.replace("_", " ")}
              </span>
              {NEXT_STATUS[t.status].map((next) => (
                <button
                  key={next}
                  onClick={() => moveTask(t.id, next)}
                  className="text-xs font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded px-2 py-1 transition"
                >
                  → {next.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
