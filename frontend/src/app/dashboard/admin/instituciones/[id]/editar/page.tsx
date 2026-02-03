'use client';

import { useParams } from 'next/navigation';
import { InstitucionForm } from '@/components/admin/institucion-form';

export default function EditarInstitucionPage() {
  const params = useParams();
  const id = params.id as string;

  return <InstitucionForm mode="edit" institucionId={id} />;
}
