import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  User,
  BookOpen,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  UserCheck,
  FileText,
  School,
} from 'lucide-react';

interface AppSidebarProps {
  userRole: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  // Common navigation items
  const commonItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Profile", url: "/profile", icon: User },
  ];

  // Volunteer-specific items
  const volunteerItems = [
    { title: "My Classes", url: "/classes", icon: BookOpen },
    { title: "My Syllabus", url: "/syllabus", icon: FileText },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Announcements", url: "/announcements", icon: MessageSquare },
  ];

  // Admin-specific items
  const adminItems = [
    { title: "Manage Volunteers", url: "/admin/volunteers", icon: Users },
    { title: "Manage Classes", url: "/admin/classes", icon: School },
    { title: "Approve Syllabus", url: "/admin/syllabus", icon: UserCheck },
    { title: "Post Announcements", url: "/admin/announcements", icon: MessageSquare },
    { title: "Reports", url: "/admin/reports", icon: BarChart3 },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  // Determine items based on role
  const menuItems = () => {
    if (userRole === 'admin') {
      return [...commonItems, ...adminItems];
    } else if (userRole === 'volunteer') {
      return [...commonItems, ...volunteerItems];
    } else {
      // Public/viewer role
      return [
        { title: "Syllabus", url: "/public/syllabus", icon: BookOpen },
        { title: "Announcements", url: "/public/announcements", icon: MessageSquare },
      ];
    }
  };

  const items = menuItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {userRole === 'admin' ? 'Administration' : 
             userRole === 'volunteer' ? 'Volunteer Portal' : 
             'Public Access'}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}