import { useCallback, useEffect, useMemo, useState } from "react";
import { UserCog } from "lucide-react";
import AppShell from "../layout/AppShell";
import { useAuth } from "../../contexts/AuthContext.js";
import { useMyProfile } from "../my-page/lib/useMyProfile";
import { useMySchedule, useMyAlerts } from "../my-page/lib/useMyDay";
import {
  loadTasks,
  saveTasks,
  loadQuickLinks,
  saveQuickLinks,
  loadNotificationPrefs,
  saveNotificationPrefs,
  loadCollapsed,
  saveCollapsed,
  type MyTask,
  type QuickLink,
  type NotificationPrefs,
} from "../my-page/lib/myPageStorage";
import MyPageHero from "../my-page/widgets/MyPageHero";
import MyStatsStrip from "../my-page/widgets/MyStatsStrip";
import MyScheduleWidget from "../my-page/widgets/MyScheduleWidget";
import MyTasksWidget from "../my-page/widgets/MyTasksWidget";
import MyAlertsWidget from "../my-page/widgets/MyAlertsWidget";
import QuickLinksWidget from "../my-page/widgets/QuickLinksWidget";
import AccountSettingsSection from "../my-page/widgets/AccountSettingsSection";
import CollapsibleSection from "../my-page/components/CollapsibleSection";

interface MyPageProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

/**
 * My Page — the user's personalized home dashboard after login.
 *
 * Distinct from the office-wide Dashboard: everything here is scoped to *you* —
 * your schedule (via your linked provider), your tasks, your shortcuts, your
 * account. Personal state that has no backend home (tasks, favorites, prefs,
 * folded panels) persists per-user to localStorage; live data (schedule,
 * alerts) is derived from the same office feed the Dashboard already caches.
 */
export default function MyPage({ onLogout, currentOffice, setCurrentOffice }: MyPageProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const profileQuery = useMyProfile();
  const profile = profileQuery.data?.user;
  const providerId = profile?.report_access_provider_id ?? null;

  const schedule = useMySchedule(currentOffice, providerId);
  const { alerts, isLoading: alertsLoading } = useMyAlerts(currentOffice);

  /* ---- Per-user persisted state (rehydrates when the user changes) ---- */
  const [tasks, setTasks] = useState<MyTask[]>(() => loadTasks(userId));
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => loadQuickLinks(userId));
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs(userId));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsed(userId));

  useEffect(() => {
    setTasks(loadTasks(userId));
    setQuickLinks(loadQuickLinks(userId));
    setPrefs(loadNotificationPrefs(userId));
    setCollapsed(loadCollapsed(userId));
  }, [userId]);

  const updateTasks = useCallback(
    (next: MyTask[]) => {
      setTasks(next);
      saveTasks(userId, next);
    },
    [userId],
  );
  const updateQuickLinks = useCallback(
    (next: QuickLink[]) => {
      setQuickLinks(next);
      saveQuickLinks(userId, next);
    },
    [userId],
  );
  const updatePrefs = useCallback(
    (next: NotificationPrefs) => {
      setPrefs(next);
      saveNotificationPrefs(userId, next);
    },
    [userId],
  );
  const toggleSection = useCallback(
    (key: string) => {
      setCollapsed((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        saveCollapsed(userId, next);
        return next;
      });
    },
    [userId],
  );

  const openTaskCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const accountOpen = collapsed["account"] === true; // default collapsed

  return (
    <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 space-y-6">
        <MyPageHero
          name={user?.name}
          role={user?.role}
          currentOffice={currentOffice}
          imageUrl={profile?.image_url}
          lastLoginAt={profile?.last_login_at}
        />

        <MyStatsStrip schedule={schedule} openTaskCount={openTaskCount} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <MyScheduleWidget schedule={schedule} />
            <MyTasksWidget tasks={tasks} onChange={updateTasks} />
          </div>
          <div className="space-y-6">
            <MyAlertsWidget alerts={alerts} isLoading={alertsLoading} />
            <QuickLinksWidget links={quickLinks} onChange={updateQuickLinks} />
          </div>
        </div>

        <CollapsibleSection
          title="Account & Settings"
          icon={<UserCog className="w-4 h-4" />}
          open={accountOpen}
          onToggle={() => toggleSection("account")}
        >
          <AccountSettingsSection
            profile={profile}
            role={user?.role}
            prefs={prefs}
            onPrefsChange={updatePrefs}
          />
        </CollapsibleSection>
      </div>
    </AppShell>
  );
}
