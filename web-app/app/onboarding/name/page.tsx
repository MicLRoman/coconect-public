"use client";
import { useRouter } from 'next/navigation';
import { StepName } from '../components/StepName';
import { useOnboardingData } from '../useOnboardingData';

export default function NamePage() {
  const router = useRouter();
  const { formData, updateBasic, isLoaded } = useOnboardingData();
  if (!isLoaded) return null;
  return (
    <StepName
      formData={formData}
      updateBasic={updateBasic}
      onNext={() => router.push('/onboarding/age')}
      onBack={() => router.push('/onboarding/method')}
    />
  );
}
