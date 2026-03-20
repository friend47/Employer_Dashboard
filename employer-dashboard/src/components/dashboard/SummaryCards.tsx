import { FileText, Users, Briefcase, CheckCircle, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";

type Kpis = {
  active_jobs: number;
  total_applications: number;
  workers_hired: number;
  completed_jobs: number;
  open_positions: number;
};

const SummaryCards = () => {
  const { data, isLoading, error } = useQuery<Kpis>({
    queryKey: ["employer-kpis"],
    queryFn: () => fetchJson<Kpis>("/api/employer/kpis"),
  });

  const cards = [
    { title: "Active Jobs", value: data?.active_jobs ?? "--", icon: FileText, desc: "Live job posts" },
    { title: "Total Applications", value: data?.total_applications ?? "--", icon: Users, desc: "All recent applications" },
    { title: "Workers Hired", value: data?.workers_hired ?? "--", icon: Briefcase, desc: "Confirmed hires" },
    { title: "Completed Jobs", value: data?.completed_jobs ?? "--", icon: CheckCircle, desc: "Finished placements" },
    { title: "Open Positions", value: data?.open_positions ?? "--", icon: Target, desc: "Roles still available" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.title} className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 break-words text-xl font-display font-semibold text-card-foreground sm:text-2xl">
            {isLoading ? "..." : card.value}
          </p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
            {error ? "Unable to load data" : card.desc}
          </p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
