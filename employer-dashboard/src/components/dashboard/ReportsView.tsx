import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchJson } from "@/lib/api";

type Funnel = { applications: number; approved: number; hired: number; completed: number };

const ReportsView = () => {
  const { data, isLoading, error } = useQuery<Funnel>({
    queryKey: ["hiring-funnel"],
    queryFn: () => fetchJson<Funnel>("/api/employer/hiring-funnel"),
  });

  const chartData = data
    ? [
        { stage: "Applications", value: data.applications },
        { stage: "Approved", value: data.approved },
        { stage: "Hired", value: data.hired },
        { stage: "Completed", value: data.completed },
      ]
    : [];

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <h3 className="font-display font-semibold text-card-foreground mb-4">Hiring Funnel</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !isLoading && <p className="text-sm text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
      {!isLoading && !error && chartData.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="stage" tick={{ fill: "hsl(220 9% 46%)", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(220 9% 46%)", fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
