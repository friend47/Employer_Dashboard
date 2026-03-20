import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";

type ApplicantRow = {
  job_application_id: number;
  job_seeker_id: number;
  job_title: string;
  applied_at: string;
  province: string;
};

const ApplicantsTable = () => {
  const { data, isLoading, error } = useQuery<ApplicantRow[]>({
    queryKey: ["employer-applicants"],
    queryFn: () => fetchJson<ApplicantRow[]>("/api/employer/recent-applications"),
  });

  const [search, setSearch] = useState("");

  const filtered = (data || []).filter((a) => {
    const term = search.toLowerCase();
    const matchSearch = (a.job_title || "").toLowerCase().includes(term) || String(a.job_seeker_id).includes(term);
    return matchSearch;
  });

  return (
    <div className="rounded-lg bg-card p-4 sm:p-5 shadow-sm border border-border">
      <h3 className="font-display font-semibold text-card-foreground mb-4">Applicants</h3>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search seeker ID or job..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Seeker ID</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Applied For</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Province</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Applied</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {error && !isLoading && <tr><td colSpan={5} className="py-6 text-center text-destructive">โหลดข้อมูลไม่สำเร็จ</td></tr>}
            {!isLoading && !error && filtered.map((a) => (
              <tr key={a.job_application_id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                <td className="py-3 font-medium text-card-foreground">#{a.job_seeker_id}</td>
                <td className="py-3 text-muted-foreground">{a.job_title}</td>
                <td className="py-3 text-muted-foreground">{a.province}</td>
                <td className="py-3 text-muted-foreground">{a.applied_at}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="View Profile">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-success/10 transition-colors" title="Accept">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Reject">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">No applicants found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading && <p className="text-center text-muted-foreground">Loading…</p>}
        {error && !isLoading && <p className="text-center text-destructive">โหลดข้อมูลไม่สำเร็จ</p>}
        {!isLoading && !error && filtered.map((a) => (
          <div key={a.job_application_id} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-card-foreground">Seeker #{a.job_seeker_id}</p>
                <p className="text-xs text-muted-foreground">{a.job_title}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{a.province}</span>
              <span className="text-muted-foreground">{a.applied_at}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-secondary text-xs text-muted-foreground hover:bg-accent transition-colors">
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-success/10 text-xs text-success hover:bg-success/20 transition-colors">
                <CheckCircle className="h-3.5 w-3.5" /> Accept
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-destructive/10 text-xs text-destructive hover:bg-destructive/20 transition-colors">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </div>
        ))}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No applicants found</p>
        )}
      </div>
    </div>
  );
};

export default ApplicantsTable;
