import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays, Banknote, Users } from "lucide-react";
import { fetchJson } from "@/lib/api";
import EmploymentsQuartileChart, { type EmploymentsQuartileDatum } from "@/components/dashboard/EmploymentsQuartileChart";

type TimelineRow = {
  jobpost_id: string;
  title: string;
  job_type: string;
  employment_count: number;
  earliest_start: string;
  latest_end: string;
  total_agreed_wage: number;
  employment_status: string;
};

type Summary = {
  overall_start: string;
  overall_end: string;
  grand_total_wage: number;
  total_employments: number;
};

type TimelineResponse = {
  timeline: TimelineRow[];
  summary: Summary;
};

const COLORS = [
  "hsl(355 92% 72%)",
  "hsl(276 72% 67%)",
  "hsl(239 84% 67%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(25 95% 53%)",
  "hsl(174 72% 40%)",
  "hsl(346 77% 50%)",
  "hsl(217 91% 60%)",
  "hsl(47 96% 53%)",
  "hsl(280 67% 50%)",
];

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDateValue = (value: string) => {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "d MMM yyyy");
};

const EmploymentsTab = () => {
  const [selectedJobpostId, setSelectedJobpostId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<TimelineResponse>({
    queryKey: ["employment-timeline"],
    queryFn: () => fetchJson<TimelineResponse>("/api/employer/employment-timeline"),
  });

  const aggregated = useMemo(() => {
    if (!data?.timeline) return [];

    const map = new Map<string, {
      jobpost_id: string;
      title: string;
      job_type: string;
      total_agreed_wage: number;
      employment_count: number;
      earliest_start: string;
      latest_end: string;
    }>();

    for (const row of data.timeline) {
      const existing = map.get(row.jobpost_id);

      if (existing) {
        existing.total_agreed_wage += row.total_agreed_wage;
        existing.employment_count += row.employment_count;
        if (row.earliest_start < existing.earliest_start) existing.earliest_start = row.earliest_start;
        if (row.latest_end > existing.latest_end) existing.latest_end = row.latest_end;
      } else {
        map.set(row.jobpost_id, {
          jobpost_id: row.jobpost_id,
          title: row.title,
          job_type: row.job_type,
          total_agreed_wage: row.total_agreed_wage,
          employment_count: row.employment_count,
          earliest_start: row.earliest_start,
          latest_end: row.latest_end,
        });
      }
    }

    return Array.from(map.values()).sort((left, right) => {
      const leftDate = parseISO(left.earliest_start).getTime();
      const rightDate = parseISO(right.earliest_start).getTime();

      if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return left.total_agreed_wage - right.total_agreed_wage;
    });
  }, [data?.timeline]);

  const chartData = useMemo<EmploymentsQuartileDatum[]>(
    () =>
      aggregated.map((row, index) => ({
        jobpostId: row.jobpost_id,
        label: row.title,
        jobType: row.job_type,
        start: row.earliest_start,
        end: row.latest_end,
        wage: row.total_agreed_wage,
        employmentCount: row.employment_count,
        color: COLORS[index % COLORS.length],
      })),
    [aggregated],
  );

  useEffect(() => {
    setSelectedJobpostId((current) => {
      if (!aggregated.length) return null;
      if (current && aggregated.some((row) => row.jobpost_id === current)) return current;
      return aggregated[0].jobpost_id;
    });
  }, [aggregated]);

  const summary = data?.summary;
  const selectedRow = aggregated.find((row) => row.jobpost_id === selectedJobpostId) ?? aggregated[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="break-words text-sm font-semibold text-card-foreground">
                {formatDateValue(summary.overall_start)} - {formatDateValue(summary.overall_end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Banknote className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Agreed Wage</p>
              <p className="break-words text-sm font-semibold text-card-foreground">
                {formatCurrency(summary.grand_total_wage)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Employments</p>
              <p className="text-sm font-semibold text-card-foreground">
                {summary.total_employments}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display font-semibold text-card-foreground">
              Employment Quartile Timeline
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each jobpost is drawn as a date-range bar. The X-axis tracks the employment timeline and the Y-axis tracks total agreed wage.
            </p>
          </div>
          {selectedRow && (
            <div className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
              Focus: <span className="font-medium text-card-foreground">{selectedRow.title}</span>
            </div>
          )}
        </div>

        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}
        {error && !isLoading && <p className="mt-4 text-sm text-destructive">Unable to load chart data</p>}
        {!isLoading && !error && chartData.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No employments data</p>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <div className="mt-4">
            <EmploymentsQuartileChart
              data={chartData}
              selectedJobpostId={selectedJobpostId}
              onSelectJobpost={setSelectedJobpostId}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display font-semibold text-card-foreground">Employment Details</h3>
          {selectedRow && (
            <p className="text-sm text-muted-foreground">
              Selected range: {formatDateValue(selectedRow.earliest_start)} - {formatDateValue(selectedRow.latest_end)}
            </p>
          )}
        </div>

        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium text-muted-foreground">Job Title</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Employments</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Start</th>
                <th className="py-2 text-left font-medium text-muted-foreground">End</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Agreed Wage</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((row) => {
                const isSelected = row.jobpost_id === selectedJobpostId;

                return (
                  <tr
                    key={row.jobpost_id}
                    onClick={() => setSelectedJobpostId(row.jobpost_id)}
                    className={`border-b border-border last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-accent/50"
                    } cursor-pointer`}
                  >
                    <td className="py-3 font-medium text-card-foreground">{row.title}</td>
                    <td className="py-3 text-muted-foreground">{row.job_type}</td>
                    <td className="py-3 text-right text-muted-foreground">{row.employment_count}</td>
                    <td className="py-3 text-muted-foreground">{formatDateValue(row.earliest_start)}</td>
                    <td className="py-3 text-muted-foreground">{formatDateValue(row.latest_end)}</td>
                    <td className="py-3 text-right font-medium text-card-foreground">{formatCurrency(row.total_agreed_wage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {aggregated.map((row) => {
            const isSelected = row.jobpost_id === selectedJobpostId;

            return (
              <button
                key={row.jobpost_id}
                type="button"
                onClick={() => setSelectedJobpostId(row.jobpost_id)}
                className={`w-full space-y-3 rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-card-foreground">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.job_type}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                    {row.employment_count} hires
                  </span>
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <p>Start: {formatDateValue(row.earliest_start)}</p>
                  <p>End: {formatDateValue(row.latest_end)}</p>
                </div>
                <div className="rounded-md bg-secondary/60 px-3 py-2 text-sm font-medium text-card-foreground">
                  {formatCurrency(row.total_agreed_wage)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmploymentsTab;
