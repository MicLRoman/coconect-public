"use client";

import { useRouter } from 'next/navigation';
import { StepIndustrySkills } from '../components/StepIndustrySkills';
import { useOnboardingData } from '../useOnboardingData';

export default function IndustrySkillsPage() {
  const router = useRouter();
  const { formData, toggleIndustry, toggleSkill, isLoaded } = useOnboardingData();

  if (!isLoaded) return null;

  return (
    <StepIndustrySkills
      formData={formData}
      toggleIndustry={toggleIndustry}
      toggleSkill={toggleSkill}
      onNext={() => router.push('/onboarding/status')}
      onBack={() => router.push('/onboarding/foundation')}
    />
  );
}