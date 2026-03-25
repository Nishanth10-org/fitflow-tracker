import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Dumbbell, LayoutDashboard, PlusCircle, History, User, Brain, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/log-workout", icon: PlusCircle, label: "Log Workout" },
  { to: "/history", icon: History, label: "History" },
  { to: "/insights", icon: Brain, label: "AI Insights" },
  { to: "/profile", icon: User, label: "Profile" },
];

const AppLayout = () => {
  const { user, loading, signOut, profile } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary">
              <Dumbbell className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-sidebar-foreground">FitTrack</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
            <User className="h-4 w-4" />
            <span className="truncate">{profile?.name || user.email}</span>
          </div>
          <SidebarMenuButton onClick={signOut} className="mt-1 text-sidebar-foreground/50 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-display text-lg font-semibold">
            {NAV_ITEMS.find((i) => i.to === location.pathname)?.label || "FitTrack"}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
