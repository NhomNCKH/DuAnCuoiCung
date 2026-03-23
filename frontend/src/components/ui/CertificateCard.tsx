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
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div>
        <p className="font-medium text-gray-800">{certificate.student}</p>
        <p className="text-sm text-gray-500">{certificate.id}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-emerald-600">{certificate.score}</span>
        {certificate.status === "verified" ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-500" />
        )}
      </div>
    </div>
  );
}