import { useEffect, useState } from "react";
import { api } from "../api/client";
import TaskList from "../components/TaskList";
import ActivityFeed from "../components/ActivityFeed";

export default function DeveloperDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold mb-3">My Tasks</h2>
        <TaskList key={refreshKey} onTaskUpdated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <div>
        <ActivityFeed />
      </div>
    </div>
  );
}
