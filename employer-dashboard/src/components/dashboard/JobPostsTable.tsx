import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Pencil, XCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api";

type JobPost = {
  jobpost_id: number;
  title: string;
  job_type: string;
  province: string;
  approval_status: string;
  applicants: number;
  posted_date: string;
  wage_amount: number;
};

const JobPostsTable = () => {
  const { data, isLoading, error } = useQuery<JobPost[]>({
    queryKey: ["employer-jobposts"],
    queryFn: () => fetchJson<JobPost[]>("/api/employer/jobposts"),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");

  const provinces = Array.from(new Set((data || []).map((j) => j.province))).sort();
  const jobTypes = Array.from(new Set((data || []).map((j) => j.job_type))).sort();
  const statuses = Array.from(new Set((data || []).map((j) => j.approval_status || "Unknown"))).sort();

  const filtered = (data || []).filter((job) => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase());
    const matchType = jobTypeFilter === "All" || job.job_type === jobTypeFilter;
    const matchStatus = statusFilter === "All" || (job.approval_status || "Unknown") === statusFilter;
    const matchProvince = provinceFilter === "All" || job.province === provinceFilter;
    return matchSearch && matchType && matchStatus && matchProvince;
  });

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-semibold text-card-foreground">Job Posts</h3>
        <Button size="sm" className="gap-1 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Job Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg bg-secondary px-2 sm:px-3 text-xs sm:text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="h-9 rounded-lg bg-secondary px-2 sm:px-3 text-xs sm:text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="h-9 rounded-lg bg-secondary px-2 sm:px-3 text-xs sm:text-sm text-foreground border-none outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Types</option>
            {jobTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Job Title</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Type</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Salary</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Province</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Applicants</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Posted</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {error && !isLoading && (
              <tr><td colSpan={8} className="py-6 text-center text-destructive">โหลดข้อมูลไม่สำเร็จ</td></tr>
            )}
            {!isLoading && !error && filtered.map((job) => (
              <tr key={job.jobpost_id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                <td className="py-3 font-medium text-card-foreground">{job.title}</td>
                <td className="py-3">
                  <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>
                </td>
                <td className="py-3 text-muted-foreground">
                  {job.wage_amount ? `฿${job.wage_amount.toLocaleString()}` : "N/A"}
                </td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.approval_status?.toLowerCase() === "approved"
                      ? "bg-success/10 text-success"
                      : job.approval_status?.toLowerCase() === "pending"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}>
                    {job.approval_status || "Unknown"}
                  </span>
                </td>
                <td className="py-3 text-muted-foreground">{job.province}</td>
                <td className="py-3 text-muted-foreground">{job.applicants}</td>
                <td className="py-3 text-muted-foreground">{job.posted_date}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="View">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Close">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">No jobs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading && <p className="text-center text-muted-foreground">Loading…</p>}
        {error && !isLoading && <p className="text-center text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
        {!isLoading && !error && filtered.map((job) => (
          <div key={job.jobpost_id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-card-foreground">{job.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{job.province} · {job.posted_date}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.approval_status?.toLowerCase() === "approved"
                  ? "bg-success/10 text-success"
                  : job.approval_status?.toLowerCase() === "pending"
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                }`}>
                {job.approval_status || "Unknown"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{job.job_type}</Badge>
              <span className="text-muted-foreground">
                {job.wage_amount ? `฿${job.wage_amount.toLocaleString()}` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{job.applicants} applicants</span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="View">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Edit">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Close">
                  <XCircle className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No jobs found</p>
        )}
      </div>
    </div>
  );
};

export default JobPostsTable;
