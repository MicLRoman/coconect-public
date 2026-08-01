"use client";

import { useRouter } from 'next/navigation';
import { StepAsk } from '../components/StepAsk';
import { useOnboardingData } from '../useOnboardingData';

export default function AskPage() {
  const router = useRouter();
  const { formData, setFullFormData, isLoaded } = useOnboardingData();

  // Пока данные из sessionStorage не подгрузились, ничего не рендерим, 
  // чтобы не словить ошибку undefined[cite: 1]
  if (!isLoaded) return null;

  const handleFinish = () => {
    // Фиксируем финальный результат для страницы регистрации[cite: 1, 8]
    sessionStorage.setItem('tablr_onboarding_complete', JSON.stringify(formData));
    router.push('/registration?mode=signup');
  };

  return (
    <StepAsk 
      formData={formData} 
      // Прокидываем функцию обновления под именем, которое ждет компонент[cite: 1]
      setFormData={setFullFormData} 
      onFinish={handleFinish} 
      onBack={() => router.push('/onboarding/work-vibe')} 
    />
  );
}