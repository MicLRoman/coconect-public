"use client";

import { useRouter } from 'next/navigation';
import { StepMethod } from '../components/StepMethod';
import { useOnboardingData } from '../useOnboardingData';

export default function MethodPage() {
  const router = useRouter();
  const { setFullFormData, isLoaded } = useOnboardingData();

  if (!isLoaded) return null;

  const handleSelectManual = () => router.push('/onboarding/name');

  const handleSelectResume = () => {
    // Здесь может быть логика загрузки файла, после которой редирект
    router.push('/onboarding/name');
  };

  const handleSelectLinkedin = () => {
    // Здесь логика импорта, затем переход
    router.push('/onboarding/name');
  };

  return (
    <StepMethod
      onSelectManual={handleSelectManual}
      onSelectResume={handleSelectResume}
      onSelectLinkedin={handleSelectLinkedin}
    />
  );
}