"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Trophy,
  CalendarDays,
  Users,
  BarChart2,
  Flower,
  ChevronDown,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserService } from "@/services/user-service";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { RegisterDialog } from "@/components/auth/RegisterDialog";

export default function AppSidebar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await UserService.logout();
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const menuItems = [
    { title: "Home", icon: Home, path: "/" },
    { title: "Events", icon: CalendarDays, path: "/event-search" },
    { title: "Fighters", icon: Users, path: "/fighter-search" },
    { title: "Rankings", icon: BarChart2, path: "/rankings" },
    { title: "Leaderboard", icon: Trophy, path: "/leaderboard" },
  ];

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <Sidebar
      className="border-r border-gray-800 w-64 shrink-0 bg-gray-950"
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-gray-800 px-4 py-6 bg-gray-950">
        <Flower className="h-6 w-6 text-white" />
      </SidebarHeader>
      <SidebarContent className="bg-gray-950">
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                Navigation
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <Link href={item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-800 p-4 bg-gray-950 space-y-4">
        {isLoggedIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="h-4 w-4" />
              <span>Welcome back!</span>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Logging out..." : "Logout"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <LoginDialog onLoginSuccess={handleLoginSuccess} />
            <RegisterDialog onRegisterSuccess={handleLoginSuccess} />
          </div>
        )}
        <p className="text-sm text-gray-400 pt-2">© 2024 Introducing First</p>
      </SidebarFooter>
    </Sidebar>
  );
}
