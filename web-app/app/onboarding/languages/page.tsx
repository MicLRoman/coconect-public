"use client";
import { useRouter } from 'next/navigation';
import { StepLanguages } from '../components/StepLanguages';
import { useOnboardingData } from '../useOnboardingData';

export default function LanguagesPage() {
  const router = useRouter();
  const { formData, toggleLanguage, isLoaded } = useOnboardingData();
  if (!isLoaded) return null;
  return (
    <StepLanguages
      formData={formData}
      toggleLanguage={toggleLanguage}
      onNext={() => router.push('/onboarding/foundation')}
      onBack={() => router.push('/onboarding/city')}
    />
  );
}
