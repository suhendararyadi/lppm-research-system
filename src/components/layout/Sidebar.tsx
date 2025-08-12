'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  FileText,
  Users,
  Heart,
  BarChart3,
  Settings,
  Menu,
  ChevronDown,
  ChevronRight,
  BookOpen,
  UserCheck,
  Calendar,
  Award,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: string[];
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
        title: 'Proposal Saya',
        href: '/research/my-proposals',
        icon: FileText,
      },
      {
        title: 'Semua Proposal',
        href: '/research/proposals',
        icon: FileText,
        roles: ['admin', 'reviewer'],
      },
      {
        title: 'Review',
        href: '/research/review',
        icon: UserCheck,
        roles: ['reviewer', 'admin'],
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
      },
      {
        title: 'Jadwal Kegiatan',
        href: '/service/schedule',
        icon: Calendar,
      },
    ],
  },
  {
    title: 'Pengguna',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Laporan',
    icon: BarChart3,
    roles: ['admin'],
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
  {
    title: 'Notifikasi',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: 'Pengaturan',
    href: '/settings',
    icon: Settings,
  },
];

function NavItems({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const hasPermission = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return user?.role && roles.includes(user.role);
  };

  return (
    <div className={className}>
      {items.map((item) => {
        if (!hasPermission(item.roles)) return null;

        const isExpanded = expandedItems.includes(item.title);
        const isActive = item.href ? pathname === item.href : false;
        const hasActiveChild = item.children?.some(child => pathname === child.href);

        if (item.children) {
          return (
            <div key={item.title}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start px-2 py-2 h-auto font-normal',
                  (isActive || hasActiveChild) && 'bg-accent text-accent-foreground'
                )}
                onClick={() => toggleExpanded(item.title)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span className="flex-1 text-left">{item.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <NavItems items={item.children} />
                </div>
              )}
            </div>
          );
        }

        return (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              'w-full justify-start px-2 py-2 h-auto font-normal',
              isActive && 'bg-accent text-accent-foreground'
            )}
            asChild
          >
            <Link href={item.href!}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            LPPM System
          </h2>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1 p-2">
              <NavItems items={navigation} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}