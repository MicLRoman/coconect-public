"use client";
import { useRouter } from 'next/navigation';
import { StepCity } from '../components/StepCity';
import { useOnboardingData } from '../useOnboardingData';

export default function CityPage() {
  const router = useRouter();
  const { formData, updateBasic, isLoaded } = useOnboardingData();
  if (!isLoaded) return null;
  return (
    <StepCity
      formData={formData}
      updateBasic={updateBasic}
      onNext={() => router.push('/onboarding/languages')}
      onBack={() => router.push('/onboarding/age')}
    />
  );
}
