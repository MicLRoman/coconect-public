"use client";
import { useRouter } from 'next/navigation';
import { StepAge } from '../components/StepAge';
import { useOnboardingData } from '../useOnboardingData';

export default function AgePage() {
  const router = useRouter();
  const { formData, updateBasic, isLoaded } = useOnboardingData();
  if (!isLoaded) return null;
  return (
    <StepAge
      formData={formData}
      updateBasic={updateBasic}
      onNext={() => router.push('/onboarding/city')}
      onBack={() => router.push('/onboarding/name')}
    />
  );
}
