import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { fetchJson } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

type JobpostSummary = {
  jobpost_id: string;
  job_type: string;
  applicant_count: number;
  total_agreed_wage: number;
};

type ApplicantRow = {
  job_application_id: number;
  job_seeker_id: number;
  jobpost_id: string;
  job_title: string;
  applied_at: string;
  province: string;
};

const COLORS = [
  "hsl(239 84% 67%)",
  "hsl(330 81% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(199 89% 48%)",
  "hsl(262 83% 58%)",
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

const JobpostTab = () => {
  const [selectedJobpost, setSelectedJobpost] = useState<string>("all");
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery<JobpostSummary[]>({
    queryKey: ["jobpost-summary"],
    queryFn: () => fetchJson<JobpostSummary[]>("/api/employer/jobpost-summary"),
  });

  const applicantPath = selectedJobpost === "all"
    ? "/api/employer/recent-applications"
    : `/api/employer/recent-applications?jobpost_id=${selectedJobpost}`;

  const { data: applicantsData, isLoading: appLoading, error: appError } = useQuery<ApplicantRow[]>({
    queryKey: ["employer-applicants", selectedJobpost],
    queryFn: () => fetchJson<ApplicantRow[]>(applicantPath),
  });

  const pieData = (summaryData || []).map((summary) => ({
    name: `${summary.job_type} (${summary.jobpost_id})`,
    value: summary.total_agreed_wage,
    jobpost_id: summary.jobpost_id,
    applicant_count: summary.applicant_count,
  }));
  const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);

  const filtered = (applicantsData || []).filter((applicant) => {
    const term = search.toLowerCase();
    return (
      (applicant.job_title || "").toLowerCase().includes(term) ||
      String(applicant.job_seeker_id).includes(term)
    );
  });

  const handlePieClick = (_: unknown, index: number) => {
    if (pieData[index]) {
      setSelectedJobpost(pieData[index].jobpost_id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display font-semibold text-card-foreground">
            Agreed Wage by Jobpost
          </h3>
          {selectedJobpost !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedJobpost("all")}
              className="self-start rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Show all jobposts
            </button>
          )}
        </div>
        {summaryLoading && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}
        {summaryError && !summaryLoading && <p className="mt-4 text-sm text-destructive">Unable to load chart data</p>}
        {!summaryLoading && !summaryError && pieData.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No data</p>
        )}
        {!summaryLoading && !summaryError && pieData.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
            <div className="h-[260px] sm:h-[320px] lg:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 84 : 120}
                    dataKey="value"
                    onClick={handlePieClick}
                    style={{ cursor: "pointer" }}
                    label={false}
                    labelLine={false}
                    paddingAngle={pieData.length > 1 ? 1 : 0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.jobpost_id}
                        fill={COLORS[index % COLORS.length]}
                        opacity={
                          selectedJobpost === "all" || selectedJobpost === entry.jobpost_id
                            ? 1
                            : 0.3
                        }
                        stroke={
                          selectedJobpost === entry.jobpost_id
                            ? "hsl(220 26% 14%)"
                            : "hsl(0 0% 100%)"
                        }
                        strokeWidth={selectedJobpost === entry.jobpost_id ? 3 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string, _name: string, props: { payload?: { applicant_count?: number } }) => [
                      `${formatCurrency(Number(value))} (${props.payload?.applicant_count ?? 0} applicants)`,
                      "Agreed wage",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:max-h-[360px] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
              {pieData.map((item, index) => {
                const isSelected = selectedJobpost === item.jobpost_id;
                const percentage = totalPieValue > 0 ? Math.round((item.value / totalPieValue) * 100) : 0;

                return (
                  <button
                    key={item.jobpost_id}
                    type="button"
                    onClick={() => setSelectedJobpost((current) => (current === item.jobpost_id ? "all" : item.jobpost_id))}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="break-words text-sm leading-snug text-card-foreground">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{item.applicant_count} applicants</span>
                          <span>{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedJobpost}
            onChange={(e) => setSelectedJobpost(e.target.value)}
            className="h-10 w-full rounded-lg bg-secondary px-3 text-sm text-foreground outline-none ring-0 transition-shadow focus:ring-2 focus:ring-ring sm:w-72"
          >
            <option value="all">All Jobposts</option>
            {(summaryData || []).map((summary) => (
              <option key={summary.jobpost_id} value={summary.jobpost_id}>
                {summary.jobpost_id} - {summary.job_type} ({formatCurrency(summary.total_agreed_wage)})
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search seeker ID or job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <h3 className="mb-3 font-display font-semibold text-card-foreground">
          Applicants {selectedJobpost !== "all" ? `- ${selectedJobpost}` : "- All"}
        </h3>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium text-muted-foreground">Seeker ID</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Applied For</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Province</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Applied</th>
                <th className="py-2 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {appError && !appLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-destructive">Unable to load applicants</td></tr>
              )}
              {!appLoading && !appError && filtered.map((applicant) => (
                <tr key={applicant.job_application_id} className="border-b border-border last:border-0 transition-colors hover:bg-accent/50">
                  <td className="py-3 font-medium text-card-foreground">#{applicant.job_seeker_id}</td>
                  <td className="py-3 text-muted-foreground">{applicant.job_title}</td>
                  <td className="py-3 text-muted-foreground">{applicant.province}</td>
                  <td className="py-3 text-muted-foreground">{applicant.applied_at}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button className="rounded-md p-1.5 transition-colors hover:bg-accent" title="View Profile" type="button">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button className="rounded-md p-1.5 transition-colors hover:bg-success/10" title="Accept" type="button">
                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                      </button>
                      <button className="rounded-md p-1.5 transition-colors hover:bg-destructive/10" title="Reject" type="button">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!appLoading && !appError && filtered.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No applicants found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {appLoading && <p className="text-center text-muted-foreground">Loading...</p>}
          {appError && !appLoading && <p className="text-center text-destructive">Unable to load applicants</p>}
          {!appLoading && !appError && filtered.map((applicant) => (
            <div key={applicant.job_application_id} className="space-y-3 rounded-lg border border-border p-4">
              <div className="min-w-0">
                <p className="font-medium text-card-foreground">Seeker #{applicant.job_seeker_id}</p>
                <p className="break-words text-sm text-muted-foreground">{applicant.job_title}</p>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p>Province: {applicant.province || "-"}</p>
                <p>Applied: {applicant.applied_at || "-"}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button className="flex min-w-0 items-center justify-center gap-1 rounded-md bg-secondary px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent" type="button">
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">View</span>
                </button>
                <button className="flex min-w-0 items-center justify-center gap-1 rounded-md bg-success/10 px-2 py-2 text-xs text-success transition-colors hover:bg-success/20" type="button">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Accept</span>
                </button>
                <button className="flex min-w-0 items-center justify-center gap-1 rounded-md bg-destructive/10 px-2 py-2 text-xs text-destructive transition-colors hover:bg-destructive/20" type="button">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Reject</span>
                </button>
              </div>
            </div>
          ))}
          {!appLoading && !appError && filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No applicants found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobpostTab;
