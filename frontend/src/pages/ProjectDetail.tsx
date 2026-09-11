import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import TaskList from "../components/TaskList";
import ActivityFeed from "../components/ActivityFeed";
import { Project } from "../types";

interface Developer {
  id: string;
  name: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [developers, setDevelopers] = useState<Developer[]>([]);

  useEffect(() => {
    if (!id) return;
    api.get<{ project: Project }>(`/api/projects/${id}`).then((d) => setProject(d.project));
  }, [id, refreshKey]);

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "PM") {
      api.get<{ developers: Developer[] }>("/api/meta/developers").then((d) => setDevelopers(d.developers));
    }
  }, [user?.role]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">{project?.name ?? "Loading…"}</h1>
          <p className="text-sm text-slate-500">
            {project?.client?.name} · PM: {project?.pm?.name}
          </p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "PM") && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-3 py-1.5"
          >
            {showForm ? "Cancel" : "+ New Task"}
          </button>
        )}
      </div>

      {showForm && (
        <NewTaskForm
          projectId={id}
          developers={developers}
          onCreated={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaskList key={refreshKey} projectId={id} onTaskUpdated={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div>
          <ActivityFeed projectId={id} />
        </div>
      </div>
    </div>
  );
}

function NewTaskForm({
  projectId,
  developers,
  onCreated,
}: {
  projectId: string;
  developers: Developer[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/api/tasks/project/${projectId}`, {
        title,
        description: description || undefined,
        assignedToId: assignedToId || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2"
        />
        <select
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2"
        >
          <option value="">Unassigned</option>
          {developers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2"
        >
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2"
        />
      </div>
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full text-sm border border-slate-300 rounded-md px-3 py-2"
        rows={2}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md px-4 py-2"
      >
        {submitting ? "Creating…" : "Create Task"}
      </button>
    </form>
  );
}
