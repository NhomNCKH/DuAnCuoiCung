import React from 'react';

interface UserCardProps {
  user: {
    id: number;
    name: string;
    email: string;
    joined: string;
    status: 'active' | 'inactive';
  };
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{user.joined}</span>
        <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
      </div>
    </div>
  );
}