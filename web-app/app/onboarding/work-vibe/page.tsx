"use client";

import { useRouter } from 'next/navigation';
import { StepWorkVibe } from '../components/StepWorkVibe';
import { useOnboardingData } from '../useOnboardingData';

export default function WorkVibePage() {
  const router = useRouter();
  const { formData, updateWorkStyle, isLoaded } = useOnboardingData();

  if (!isLoaded) return null;

  return (
    <StepWorkVibe
      formData={formData}
      updateWorkStyle={updateWorkStyle}
      onNext={() => router.push('/onboarding/ask')}
      onBack={() => router.push('/onboarding/status')}
    />
  );
}