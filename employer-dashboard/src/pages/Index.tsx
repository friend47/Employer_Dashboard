import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import EmployerSidebar from "@/components/dashboard/EmployerSidebar";
import SummaryCards from "@/components/dashboard/SummaryCards";
import JobpostTab from "@/components/dashboard/JobpostTab";
import EmploymentsTab from "@/components/dashboard/EmploymentsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <EmployerSidebar activeMenu="dashboard" onMenuChange={() => { }} />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-3 py-3 sm:h-14 sm:flex-nowrap sm:px-4 sm:py-0">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="h-9 w-9 shrink-0 md:h-8 md:w-8" />
              <div className="min-w-0">
                <h1 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground sm:hidden">
                  Employer overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <span className="text-xs font-medium text-primary-foreground">TC</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-x-hidden p-3 sm:p-6">
            <DashboardView />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const DashboardView = () => (
  <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
    {/* Summary Cards */}
    <SummaryCards />

    {/* Tabs: Jobpost / Employments */}
    <Tabs defaultValue="jobpost" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
        <TabsTrigger value="jobpost" className="min-h-[2.75rem] whitespace-normal px-3 py-2 text-xs leading-tight sm:text-sm">
          Jobpost
        </TabsTrigger>
        <TabsTrigger value="employments" className="min-h-[2.75rem] whitespace-normal px-3 py-2 text-xs leading-tight sm:text-sm">
          Employments
        </TabsTrigger>
      </TabsList>
      <TabsContent value="jobpost">
        <JobpostTab />
      </TabsContent>
      <TabsContent value="employments">
        <EmploymentsTab />
      </TabsContent>
    </Tabs>
  </div>
);

export default Index;
