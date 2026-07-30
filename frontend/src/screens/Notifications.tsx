import { useMemo } from "react";
import { Bell, Trash2, CheckCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";

const ICONS: Record<string, string> = {
  order_placed: "🧾",
  payment_confirmed: "✅",
  order_dispatched: "🚚",
  order_delivered: "📦",
  order_cancelled: "⚠️",
  subscription_pending: "⏳",
  subscription_active: "🎉",
  subscription_rejected: "⚠️",
  blast: "📣",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead, deleteNotification } = useNotifications();

  const sorted = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      <div className="bg-card rounded-card p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bell size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-accent-hover transition-colors self-start md:self-auto"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="p-12 text-center text-muted-foreground text-sm">Loading notifications…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="bg-card rounded-card border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Bell size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-lg text-foreground">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              Order and subscription updates, plus announcements, will show up here.
            </p>
          </div>
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map(n => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`flex items-start gap-3 p-4 rounded-card border transition-colors cursor-pointer ${
                n.isRead ? "bg-card border-border" : "bg-primary/5 border-primary/20"
              }`}
            >
              <span className="text-xl leading-none mt-0.5">{n.icon || ICONS[n.type] || "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${n.isRead ? "font-medium text-foreground" : "font-bold text-foreground"}`}>
                    {n.title}
                  </p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(n.createdAt)}</p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  deleteNotification(n.id);
                }}
                className="text-muted-foreground hover:text-danger p-1 shrink-0"
                aria-label="Delete notification"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
