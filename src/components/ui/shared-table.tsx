"use client";

import type { HTMLAttributes, TableHTMLAttributes } from "react";

type SharedTableProps = TableHTMLAttributes<HTMLTableElement>;
type SharedSectionProps = HTMLAttributes<HTMLTableSectionElement>;

export function SharedTable({ className = "", children, ...props }: SharedTableProps) {
  return (
    <table className={`shared-table w-full ${className}`} {...props}>
      {children}
    </table>
  );
}

export function SharedTableHead({ className = "", children, ...props }: SharedSectionProps) {
  return (
    <thead className={`shared-table-head ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function SharedTableBody({ className = "", children, ...props }: SharedSectionProps) {
  return (
    <tbody className={`shared-table-body ${className}`} {...props}>
      {children}
    </tbody>
  );
}
