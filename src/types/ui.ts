// UI Component Types
import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description?: string;
  badge?: string | number;
}

export interface StatCard {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  color: string;
  bgColor?: string;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface BadgeVariant {
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}

export interface ButtonVariant {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}