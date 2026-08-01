import type { Metadata } from 'next';
import LegalDoc from '../legal/LegalDoc';
import { LEGAL_DOCS } from '../legal/content';

export const metadata: Metadata = {
    title: 'Terms of Service — coconect',
    description: 'The terms governing your use of coconect and its curated experiences.',
    alternates: { canonical: '/terms' },
};

export default function TermsPage() {
    return <LegalDoc doc={LEGAL_DOCS.terms} accent="#38bdf8" />;
}
