"use client";

import {
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type ActionIconType =
  | "add"
  | "edit"
  | "delete"
  | "lock"
  | "unlock"
  | "assignPermission"
  | "assignRole";

const ICON_BY_ACTION: Record<ActionIconType, LucideIcon> = {
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  lock: Lock,
  unlock: Unlock,
  assignPermission: KeyRound,
  assignRole: UserPlus,
};

export function ActionIcon({
  action,
  className,
}: {
  action: ActionIconType;
  className?: string;
}) {
  const Icon = ICON_BY_ACTION[action];
  return <Icon className={className} aria-hidden="true" />;
}

