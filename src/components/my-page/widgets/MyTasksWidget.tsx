import { useMemo, useState } from "react";
import { ListTodo, Plus, Trash2, Flag } from "lucide-react";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { utils } from "../../../styles/theme.js";
import type { MyTask, TaskPriority } from "../lib/myPageStorage";

interface MyTasksWidgetProps {
  tasks: MyTask[];
  onChange: (tasks: MyTask[]) => void;
}

const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-[#EF4444]", text: "text-[#DC2626]" },
  normal: { label: "Normal", dot: "bg-[#3A6EA5]", text: "text-[#3A6EA5]" },
  low: { label: "Low", dot: "bg-[#94A3B8]", text: "text-[#64748B]" },
};

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

/** A local id that doesn't depend on Date.now/Math.random being available. */
function makeId(tasks: MyTask[]): string {
  const max = tasks.reduce((m, t) => {
    const n = Number(t.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `task-${max + 1}`;
}

/**
 * A private to-do list on the user's home page. Fully client-owned and persisted
 * per-user (see myPageStorage) — add, prioritize, check off, and remove tasks.
 */
export default function MyTasksWidget({ tasks, onChange }: MyTasksWidgetProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        return a.created_at.localeCompare(b.created_at);
      }),
    [tasks],
  );

  const openCount = tasks.filter((t) => !t.done).length;

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: MyTask = {
      id: makeId(tasks),
      title: trimmed,
      priority,
      done: false,
      created_at: new Date().toISOString(),
    };
    onChange([task, ...tasks]);
    setTitle("");
    setPriority("normal");
  };

  const toggle = (id: string) =>
    onChange(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => onChange(tasks.filter((t) => t.id !== id));

  const cyclePriority = (id: string) =>
    onChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              priority: t.priority === "high" ? "normal" : t.priority === "normal" ? "low" : "high",
            }
          : t,
      ),
    );

  return (
    <WidgetCard
      title="My Tasks"
      icon={<ListTodo className="w-4 h-4" />}
      actions={
        <span className="text-[11px] font-bold text-[#64748B] tabular-nums">
          {openCount} open
        </span>
      }
      bodyClassName="p-0"
    >
      {/* Add row */}
      <div className="flex items-center gap-2 p-3 border-b border-[#E2E8F0] bg-[#F7F9FC]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Add a task…"
          className="flex-1 min-w-0 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="px-2 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] outline-none cursor-pointer"
          title="Priority"
        >
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <button
          type="button"
          onClick={addTask}
          disabled={!title.trim()}
          className="shrink-0 p-2 rounded-lg bg-[#3A6EA5] text-white hover:bg-[#2f5a8c] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed transition-colors"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
          <ListTodo className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.75} />
          <p className="text-sm text-[#64748B]">No tasks yet. Add your first above.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E2E8F0] max-h-80 overflow-y-auto">
          {sorted.map((task) => {
            const meta = PRIORITY_META[task.priority];
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F9FC] group"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggle(task.id)}
                  className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 cursor-pointer shrink-0"
                />
                <span
                  className={utils.cn(
                    "flex-1 min-w-0 text-sm truncate",
                    task.done ? "line-through text-[#94A3B8]" : "text-[#1E293B] font-medium",
                  )}
                >
                  {task.title}
                </span>
                <button
                  type="button"
                  onClick={() => cyclePriority(task.id)}
                  className={utils.cn(
                    "inline-flex items-center gap-1 text-[11px] font-bold shrink-0",
                    meta.text,
                  )}
                  title="Change priority"
                >
                  <Flag className="w-3 h-3" />
                  {meta.label}
                </button>
                <button
                  type="button"
                  onClick={() => remove(task.id)}
                  className="shrink-0 p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#EF4444]/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
