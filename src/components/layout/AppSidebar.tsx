'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Home,
  FileText,
  Users,
  Heart,
  BarChart3,
  Settings,
  BookOpen,
  UserCheck,
  Calendar,
  Award,
  Bell,
  ChevronRight,
  LogOut,
  User,
  GraduationCap,
  School,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: string[];
  badge?: string;
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Penelitian',
    icon: BookOpen,
    children: [
      {
        title: 'Buat Proposal',
        href: '/dosen/proposal/create',
        icon: FileText,
        roles: ['lecturer'],
      },
      {
        title: 'Proposal Saya',
        href: '/research/my-proposals',
        icon: FileText,
      },
      {
        title: 'Semua Proposal',
        href: '/research/proposals',
        icon: FileText,
        roles: ['super_admin', 'lppm_admin', 'reviewer'],
      },
      {
        title: 'Review',
        href: '/research/review',
        icon: UserCheck,
        roles: ['reviewer', 'super_admin', 'lppm_admin'],
        badge: '3',
      },
      {
        title: 'Laporan Progress',
        href: '/research/progress',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Pengabdian Masyarakat',
    icon: Heart,
    children: [
      {
        title: 'Program Saya',
        href: '/service/my-programs',
        icon: Heart,
      },
      {
        title: 'Semua Program',
        href: '/service/programs',
        icon: Heart,
        roles: ['admin', 'reviewer'],
      },
      {
        title: 'Review',
        href: '/service/review',
        icon: UserCheck,
        roles: ['reviewer', 'admin'],
        badge: '2',
      },
      {
        title: 'Jadwal Kegiatan',
        href: '/service/schedule',
        icon: Calendar,
      },
    ],
  },
];

const adminNavigation: NavItem[] = [
  {
    title: 'Pengguna',
    href: '/admin/users',
    icon: Users,
    roles: ['super_admin', 'lppm_admin', 'admin'],
  },
  {
    title: 'Program Studi',
    href: '/admin/program-studi',
    icon: School,
    roles: ['super_admin', 'lppm_admin', 'admin'],
  },
  {
    title: 'Laporan',
    icon: BarChart3,
    roles: ['super_admin', 'lppm_admin'],
    children: [
      {
        title: 'Statistik',
        href: '/admin/reports/statistics',
        icon: BarChart3,
      },
      {
        title: 'Kinerja',
        href: '/admin/reports/performance',
        icon: Award,
      },
    ],
  },
];

const bottomNavigation: NavItem[] = [
  {
    title: 'Notifikasi',
    href: '/notifications',
    icon: Bell,
    badge: '5',
  },
  {
    title: 'Pengaturan',
    href: '/settings',
    icon: Settings,
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    lppm_admin: 'Admin LPPM',
    dosen: 'Dosen',
    mahasiswa: 'Mahasiswa',
    reviewer: 'Reviewer',
    guest: 'Tamu',
  };
  return roleLabels[role] || role;
}

function getRoleBadgeVariant(role: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    super_admin: 'destructive',
    lppm_admin: 'destructive',
    dosen: 'default',
    mahasiswa: 'secondary',
    reviewer: 'outline',
    guest: 'outline',
  };
  return variants[role] || 'default';
}

interface NavItemsProps {
  items: NavItem[];
  level?: number;
}

function NavItems({ items, level = 0 }: NavItemsProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const filteredItems = items.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <>
      {filteredItems.map((item) => {
        const isActive = item.href ? pathname === item.href : false;
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openItems.includes(item.title);

        if (hasChildren) {
          return (
            <Collapsible
              key={item.title}
              open={isOpen}
              onOpenChange={() => toggleItem(item.title)}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      'w-full justify-between',
                      level > 0 && 'ml-4'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isOpen && 'rotate-90'
                      )}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <NavItems items={item.children || []} level={level + 1} />
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        if (level > 0) {
          return (
            <SidebarMenuSubItem key={item.title}>
              <SidebarMenuSubButton asChild isActive={isActive}>
                <Link href={item.href!}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto h-5 w-5 rounded-full p-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          );
        }

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.href!}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto h-5 w-5 rounded-full p-0 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LPPM System</span>
                  <span className="truncate text-xs">Research & Service</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigasi Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItems items={navigation} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {user && (user.role === 'super_admin' || user.role === 'lppm_admin' || user.role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItems items={adminNavigation} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bottom Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItems items={bottomNavigation} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.foto_profil} alt={user?.name} />
                    <AvatarFallback className="rounded-lg">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.foto_profil} alt={user?.name} />
                      <AvatarFallback className="rounded-lg">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                      <Badge variant={getRoleBadgeVariant(user?.role || '')} className="mt-1 w-fit text-xs">
                        {getRoleLabel(user?.role || '')}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}