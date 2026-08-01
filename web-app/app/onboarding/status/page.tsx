"use client";
import { useRouter } from 'next/navigation';
import { StepStatus } from '../components/StepStatus';
import { useOnboardingData } from '../useOnboardingData';

export default function StatusPage() {
  const router = useRouter();
  const { formData, updateStatus, isLoaded } = useOnboardingData();

  if (!isLoaded) return null;

  return (
    <StepStatus
      formData={formData}
      updateStatus={updateStatus}
      onNext={() => router.push('/onboarding/work-vibe')}
      onBack={() => router.push('/onboarding/industry-skills')}
    />
  );
}
