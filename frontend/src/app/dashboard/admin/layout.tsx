'use client';

import { AdminOnly } from '@/components/auth/role-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminOnly>{children}</AdminOnly>;
}
