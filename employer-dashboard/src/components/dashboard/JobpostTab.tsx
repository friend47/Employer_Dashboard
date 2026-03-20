import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Search } from "lucide-react";
import { fetchJson } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JobpostSummary = {
  jobpost_id: string;
  job_title: string;
  job_type: string;
  applicant_count: number;
  total_agreed_wage: number;
};

type ApplicantRow = {
  job_application_id: number;
  job_seeker_id: string;
  applicant_name: string;
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
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatAppliedDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
};

type ChartView = "applicants" | "wage";

const JobpostTab = () => {
  const [selectedJobpost, setSelectedJobpost] = useState<string>("all");
  const [chartView, setChartView] = useState<ChartView>("wage");
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
    name: summary.job_title,
    value: summary.total_agreed_wage,
    jobpost_id: summary.jobpost_id,
    applicant_count: summary.applicant_count,
  }));
  const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);
  const totalApplicants = pieData.reduce((sum, item) => sum + item.applicant_count, 0);

  const applicantsBarData = (summaryData || []).map((summary, index) => ({
    key: summary.jobpost_id,
    label: summary.job_title,
    applicants: summary.applicant_count,
    fill: COLORS[index % COLORS.length],
  }));

  const selectedSummary = (summaryData || []).find((summary) => summary.jobpost_id === selectedJobpost);
  const selectedLabel = selectedSummary?.job_title ?? selectedJobpost;

  const filtered = (applicantsData || []).filter((applicant) => {
    const term = search.toLowerCase();
    return (
      (applicant.job_title || "").toLowerCase().includes(term) ||
      (applicant.applicant_name || "").toLowerCase().includes(term) ||
      String(applicant.job_seeker_id).includes(term)
    );
  });

  const handlePieClick = (_: unknown, index: number) => {
    if (pieData[index]) {
      setSelectedJobpost(pieData[index].jobpost_id);
    }
  };

  const handleApplicantsBarClick = (_: unknown, index: number) => {
    if (applicantsBarData[index]) {
      setSelectedJobpost((current) => (
        current === applicantsBarData[index].key ? "all" : applicantsBarData[index].key
      ));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Tabs
          value={chartView}
          onValueChange={(value) => setChartView(value as ChartView)}
          className="w-full"
        >
          <div className="border-b border-border/70 bg-gradient-to-r from-primary/5 via-background to-success/5 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-card-foreground">
                    Jobpost Insights
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Switch between applicants volume and agreed wage without leaving the same panel.
                  </p>
                </div>

                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-secondary/80 p-1 sm:w-[420px]">
                  <TabsTrigger
                    value="applicants"
                    className="min-h-[2.75rem] rounded-lg px-4 py-2 text-xs font-semibold leading-tight sm:text-sm"
                  >
                    Applicants by Jobpost
                  </TabsTrigger>
                  <TabsTrigger
                    value="wage"
                    className="min-h-[2.75rem] rounded-lg px-4 py-2 text-xs font-semibold leading-tight sm:text-sm"
                  >
                    Agreed Wage by Jobpost
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  {pieData.length} jobposts
                </div>
                <div className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  {totalApplicants} applicants
                </div>
                <div className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  {formatCurrency(totalPieValue)} total wage
                </div>
                {selectedJobpost !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedJobpost("all")}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    Reset filter: {selectedLabel}
                  </button>
                )}
              </div>
            </div>
          </div>

          <TabsContent value="applicants" className="mt-0 p-4 sm:p-5">
            {summaryLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {summaryError && !summaryLoading && <p className="text-sm text-destructive">Unable to load applicants chart</p>}
            {!summaryLoading && !summaryError && applicantsBarData.length === 0 && (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
            {!summaryLoading && !summaryError && applicantsBarData.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-display font-semibold text-card-foreground">Applicants by Jobpost</h4>
                    <p className="text-sm text-muted-foreground">
                      Click a bar to filter the applicants table below.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedJobpost === "all" ? "Showing all jobposts" : `Selected: ${selectedLabel}`}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/70 p-3 sm:p-4">
                  <div className="h-[260px] sm:h-[320px] lg:h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={applicantsBarData} margin={{ top: 8, left: 8, right: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "hsl(220 9% 46%)", fontSize: 11 }}
                          interval={0}
                          height={40}
                          tickFormatter={(value: string) => value}
                        />
                        <YAxis tick={{ fill: "hsl(220 9% 46%)", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: number, _name: string, props: { payload?: { label?: string } }) => [
                            `${value} applicants`,
                            props.payload?.label ?? "Jobpost",
                          ]}
                        />
                        <Bar dataKey="applicants" radius={[6, 6, 0, 0]} onClick={handleApplicantsBarClick} style={{ cursor: "pointer" }}>
                          {applicantsBarData.map((item) => (
                            <Cell
                              key={item.key}
                              fill={item.fill}
                              opacity={selectedJobpost === "all" || selectedJobpost === item.key ? 1 : 0.35}
                              stroke={selectedJobpost === item.key ? "hsl(220 26% 14%)" : "transparent"}
                              strokeWidth={selectedJobpost === item.key ? 2 : 0}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wage" className="mt-0 p-4 sm:p-5">
            {summaryLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {summaryError && !summaryLoading && <p className="text-sm text-destructive">Unable to load chart data</p>}
            {!summaryLoading && !summaryError && pieData.length === 0 && (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
            {!summaryLoading && !summaryError && pieData.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-display font-semibold text-card-foreground">Agreed Wage by Jobpost</h4>
                    <p className="text-sm text-muted-foreground">
                      Click a slice or list item to focus the applicants table on one jobpost.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedJobpost === "all" ? "Showing all jobposts" : `Selected: ${selectedLabel}`}
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-border/70 bg-background/70 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
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
              </div>
            )}
          </TabsContent>
        </Tabs>
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
                {summary.job_title} ({formatCurrency(summary.total_agreed_wage)})
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search applicant or job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <h3 className="mb-3 font-display font-semibold text-card-foreground">
          Applicants {selectedJobpost !== "all" ? `- ${selectedLabel}` : "- All"}
        </h3>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-[28%] py-2 pr-4 text-left font-medium text-muted-foreground">Applicant Name</th>
                <th className="w-[24%] py-2 pr-4 text-left font-medium text-muted-foreground">Applied For</th>
                <th className="w-[22%] py-2 pr-4 text-left font-medium text-muted-foreground">Province</th>
                <th className="w-[26%] py-2 text-left font-medium text-muted-foreground">Applied</th>
              </tr>
            </thead>
            <tbody>
              {appLoading && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {appError && !appLoading && (
                <tr><td colSpan={4} className="py-6 text-center text-destructive">Unable to load applicants</td></tr>
              )}
              {!appLoading && !appError && filtered.map((applicant) => (
                <tr key={applicant.job_application_id} className="border-b border-border last:border-0 transition-colors hover:bg-accent/50">
                  <td className="py-3 pr-4 font-medium text-card-foreground">{applicant.applicant_name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{applicant.job_title}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{applicant.province}</td>
                  <td className="py-3 text-muted-foreground">{formatAppliedDate(applicant.applied_at)}</td>
                </tr>
              ))}
              {!appLoading && !appError && filtered.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No applicants found</td></tr>
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
                <p className="font-medium text-card-foreground">{applicant.applicant_name}</p>
                <p className="break-words text-sm text-muted-foreground">{applicant.job_title}</p>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p>Province: {applicant.province || "-"}</p>
                <p>Applied: {formatAppliedDate(applicant.applied_at)}</p>
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
