import type { Metadata } from 'next';
import LegalDoc from '../legal/LegalDoc';
import { LEGAL_DOCS } from '../legal/content';

export const metadata: Metadata = {
    title: 'Privacy Policy — coconect',
    description: 'How coconect collects, uses, and protects your personal information.',
    alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
    return <LegalDoc doc={LEGAL_DOCS.privacy} accent="#e11d48" />;
}
