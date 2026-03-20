import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { Building2, Mail, MapPin, Briefcase, CheckCircle2 } from "lucide-react";

interface EmployerData {
  employer_id: string;
  business_name: string | null;
  business_type: string | null;
  address: string | null;
  contact_method: string | null;
  contact_value: string | null;
  store_image_url: string | null;
  verified: boolean;
  total_jobs: number;
  completed_jobs: number;
  active_workers: number;
}

const EmployerProfile = () => {
  const { data: employer, isLoading, isError } = useQuery<EmployerData>({
    queryKey: ['employerProfile'],
    queryFn: () => fetchJson('/api/employer/profile'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="rounded-lg bg-card p-6 h-40"></div>
        <div className="rounded-lg bg-card p-6 h-40"></div>
      </div>
    );
  }

  if (isError || !employer) {
    return (
      <div className="rounded-lg bg-destructive/10 p-6 text-destructive border border-destructive/20">
        <p>Failed to load company profile. Please check if the employer ID is valid.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg bg-card p-6 shadow-sm border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-display font-semibold text-lg text-card-foreground">Company Summary</h3>
          {employer.verified && (
            <span className="inline-flex items-center text-xs font-medium bg-success/10 text-success px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="bg-secondary/30 p-3 rounded-md">
            <p className="text-xs uppercase tracking-wider mb-1">Total Jobs</p>
            <p className="text-2xl font-display text-card-foreground">{employer.total_jobs}</p>
          </div>
          <div className="bg-secondary/30 p-3 rounded-md">
            <p className="text-xs uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-display text-card-foreground">{employer.completed_jobs}</p>
          </div>
          <div className="bg-secondary/30 p-3 rounded-md">
            <p className="text-xs uppercase tracking-wider mb-1">Active Workers</p>
            <p className="text-2xl font-display text-card-foreground">{employer.active_workers}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-sm border border-border">
        <h3 className="font-display font-semibold text-lg text-card-foreground mb-4">Company Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Briefcase className="w-4 h-4 mr-3 shrink-0" />
            <div className="flex-1">
              <p className="text-xs mb-0.5">Business Name & Type</p>
              <p className="font-medium text-card-foreground">
                {employer.business_name || "N/A"}{employer.business_type ? ` • ${employer.business_type}` : ""}
              </p>
            </div>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Mail className="w-4 h-4 mr-3 shrink-0" />
            <div className="flex-1">
              <p className="text-xs mb-0.5">Contact ({employer.contact_method || "Email"})</p>
              <p className="font-medium text-card-foreground">{employer.contact_value || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-center text-muted-foreground">
            <MapPin className="w-4 h-4 mr-3 shrink-0" />
            <div className="flex-1">
              <p className="text-xs mb-0.5">Location</p>
              <p className="font-medium text-card-foreground">{employer.address || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfile;
