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
  ChevronRight,
  ChartNoAxesCombined,
  HelpCircle,
  Mail,
  Shield,
  FileText,
  Newspaper,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { RegisterDialog } from "@/components/auth/RegisterDialog";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsDialog } from "@/components/auth/SettingsDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp } from "lucide-react";
import Artboard13 from "@/assets/SVG/Artboard_13.svg";

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.success) {
        console.error("Logout failed:", result.error);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLoginSuccess = () => {
    // The dialog will close itself and auth state will update automatically
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const menuItems = [
    { title: "Home", icon: Home, path: "/" },
    { title: "News", icon: Newspaper, path: "/news" },
    { title: "Events", icon: CalendarDays, path: "/event-search" },
    { title: "Fighters", icon: Users, path: "/fighter-search" },
    { title: "Rankings", icon: BarChart2, path: "/rankings" },
    { title: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    { title: "Standings", icon: ChartNoAxesCombined, path: "/standings" },
  ];

  const supportItems = [
    { title: "FAQ", icon: HelpCircle, path: "/faq" },
    { title: "Contact", icon: Mail, path: "/contact" },
    { title: "Privacy Policy", icon: Shield, path: "/privacy-policy" },
  ];

  return (
    <Sidebar
      className="border-r border-gray-800 w-64 shrink-0 bg-gray-950"
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-gray-800 px-4 py-6 bg-gray-950">
        <img
          src={Artboard13.src}
          alt="Introducing First"
          width={200}
          height={200}
          className="mx-auto"
        />
      </SidebarHeader>
      <SidebarContent className="bg-gray-950">
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                Navigation
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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

        <Collapsible className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                Information & Support
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {supportItems.map((item) => (
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
      <SidebarFooter className="mt-auto border-t border-gray-800 bg-gray-950">
        <SidebarMenu>
          {isAuthenticated ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="w-full px-2">
                    <div className="flex items-center gap-3 w-full py-1.5">
                      <Avatar className="h-8 w-8 border border-gray-800 shrink-0">
                        <AvatarImage
                          src={user?.profilePicture}
                          alt={user?.username || "User avatar"}
                        />
                        <AvatarFallback>
                          {user?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden space-y-0.5">
                        <p className="text-sm font-medium text-gray-100 truncate leading-tight">
                          {user?.username}
                        </p>
                        <p className="text-xs text-gray-400 truncate leading-tight">
                          {user?.email}
                        </p>
                      </div>
                      <ChevronUp className="h-4 w-4 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width] bg-gray-950 border-gray-800"
                >
                  <DropdownMenuItem asChild>
                    <SettingsDialog />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="text-red-500 focus:text-red-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>{isLoading ? "Logging out..." : "Sign out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ) : (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <LoginDialog onLoginSuccess={handleLoginSuccess} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <RegisterDialog onRegisterSuccess={handleLoginSuccess} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        <div className="mt-auto p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">© 2024 Introducing First</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
