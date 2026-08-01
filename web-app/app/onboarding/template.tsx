import React from 'react';

// Re-mounts on every onboarding step navigation → smooth slide+fade between steps.
export default function OnboardingTemplate({ children }: { children: React.ReactNode }) {
    return <div className="animate-in fade-in slide-in-from-right-4 duration-300">{children}</div>;
}
