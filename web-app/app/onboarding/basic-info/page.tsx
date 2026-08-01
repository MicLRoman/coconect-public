"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Basic-info was split into name/age/city/languages. Keep this route as a redirect.
export default function BasicInfoRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/onboarding/name'); }, [router]);
  return null;
}
