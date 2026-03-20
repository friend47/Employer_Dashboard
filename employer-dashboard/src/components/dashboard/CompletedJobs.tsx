import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";

type Completed = {
  employment_id: number;
  title: string;
  province: string;
  applied_at: string | null;
  hired_at: string | null;
};

const CompletedJobs = () => {
  const { data, isLoading, error } = useQuery<Completed[]>({
    queryKey: ["completed-jobs"],
    queryFn: () => fetchJson<Completed[]>("/api/employer/completed-jobs"),
  });

  const rows = data || [];
  const total = rows.length;

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-card-foreground">Completed Jobs</h3>
        <span className="text-xs text-muted-foreground">{total} records</span>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !isLoading && <p className="text-sm text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
      {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}

      {!isLoading && !error && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((job) => (
            <div key={job.employment_id} className="rounded-lg border border-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-medium text-card-foreground">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.province || "-"} · Applied {job.applied_at || "-"} · Hired {job.hired_at || "-"}</p>
              </div>
              <span className="text-xs text-muted-foreground">ID #{job.employment_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletedJobs;
