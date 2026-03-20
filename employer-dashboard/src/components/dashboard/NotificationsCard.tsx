import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";

type Notice = {
  jobpost_id: number;
  title: string;
  status: string;
  created_at: string;
};

const NotificationsCard = () => {
  const { data, isLoading, error } = useQuery<Notice[]>({
    queryKey: ["notifications"],
    queryFn: () => fetchJson<Notice[]>("/api/employer/notifications"),
  });

  const items = data || [];

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-card-foreground">Notifications</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !isLoading && <p className="text-sm text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
      {!isLoading && !error && items.length === 0 && <p className="text-sm text-muted-foreground">No pending items</p>}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.jobpost_id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{n.status || "Unknown"} · {n.created_at}</p>
              </div>
              <span className="text-xs text-muted-foreground">#{n.jobpost_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsCard;
