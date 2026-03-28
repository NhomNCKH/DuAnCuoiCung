import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

interface CertificateCardProps {
  certificate: {
    id: string;
    student: string;
    score: number;
    date: string;
    status: 'verified' | 'pending';
  };
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
      <div>
        <p className="font-medium text-slate-900">{certificate.student}</p>
        <p className="text-sm text-slate-500">{certificate.id}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-blue-700">{certificate.score}</span>
        {certificate.status === "verified" ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-500" />
        )}
      </div>
    </div>
  );
}