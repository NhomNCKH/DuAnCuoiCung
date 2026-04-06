"use client";

import type { StudentNavItem } from "./config";

type Props = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  router: { push: (href: string) => void };
  items: StudentNavItem[];
};

export function StudentMobileNav({ open, onClose, pathname, router, items }: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-0 right-0 top-16 z-40 bg-white shadow-lg md:hidden">
        <nav className="p-4">
          {items.map((item) => {
            const isActive = item.href !== "#" && pathname === item.href;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else router.push(item.href);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
