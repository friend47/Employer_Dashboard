import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fetchJson } from "@/lib/api";

type StatusRow = { status: string; total: number };

const COLORS = ["hsl(160 84% 39%)", "hsl(239 84% 67%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)", "hsl(220 9% 46%)"];

const OngoingJobs = () => {
  const { data, isLoading, error } = useQuery<StatusRow[]>({
    queryKey: ["job-status"],
    queryFn: () => fetchJson<StatusRow[]>("/api/employer/job-status"),
  });

  const rows = data || [];

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <h3 className="font-display font-semibold text-card-foreground mb-4">Job Status</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !isLoading && <p className="text-sm text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
      {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
      {!isLoading && !error && rows.length > 0 && (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                {rows.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default OngoingJobs;
