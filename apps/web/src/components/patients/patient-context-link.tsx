'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { patientContextHref } from '@/lib/patient-list-navigation';

export function usePatientContextHref(href: string): string {
  const params = useSearchParams();
  return patientContextHref(href, params.get('returnTo'));
}

const PatientContextLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof NextLink>>(function PatientContextLink({ href, ...props }, ref) {
  const params = useSearchParams();
  const target = typeof href === 'string' ? patientContextHref(href, params.get('returnTo')) : href;
  return <NextLink {...props} ref={ref} href={target} />;
});

export default PatientContextLink;
