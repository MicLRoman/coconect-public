"use client";

import { useRouter } from 'next/navigation';
import { StepFoundation } from '../components/StepFoundation';
import { useOnboardingData } from '../useOnboardingData';

export default function FoundationPage() {
  const router = useRouter();
  const { formData, updateGive, toggleExperience, isLoaded } = useOnboardingData();

  if (!isLoaded) return null;

  return (
    <StepFoundation
      formData={formData}
      updateGive={updateGive}
      toggleExperience={toggleExperience}
      onNext={() => router.push('/onboarding/industry-skills')}
      onBack={() => router.push('/onboarding/languages')}
    />
  );
}