import {
  LayoutDashboard,
  Building2,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface EmployerSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
];

const EmployerSidebar = ({ activeMenu, onMenuChange }: EmployerSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sidebar-foreground" />
            <span className="font-display font-bold text-lg text-sidebar-foreground">JobPortal</span>
          </div>
        ) : (
          <Building2 className="h-6 w-6 text-sidebar-foreground mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeMenu === item.id}
                    onClick={() => onMenuChange(item.id)}
                    className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>

          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default EmployerSidebar;
