import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DataDeletion() {
    return (
        <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-[#e11d48] selection:text-white">

            {/* NAVBAR */}
            <nav className="fixed top-0 w-full z-50 bg-white/50 backdrop-blur-xl border-b border-black/5 transition-all duration-300 px-6">
                <div className="max-w-7xl w-full mx-auto h-20 flex items-center justify-between">
                    <Link href="/" className="font-black text-black text-3xl tracking-tighter cursor-pointer hover:text-[#e11d48] transition-colors">
                        coconect:
                    </Link>
                    <Link href="/" className="flex items-center gap-2 font-bold text-black uppercase text-xs tracking-widest hover:text-[#e11d48] transition-colors">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* HEADER */}
            <section className="pt-40 pb-16 px-6 bg-[#111827] text-white border-b-[4px] border-black">
                <div className="max-w-4xl mx-auto">
                    <p className="text-[#fde047] font-bold uppercase tracking-widest text-sm mb-4">Privacy & Security</p>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none">
                        Data <br /><span className="text-[#e11d48]">Deletion.</span>
                    </h1>
                    <p className="text-xl font-medium text-gray-400 border-l-[4px] border-[#e11d48] pl-4">
                        How to request the deletion of your personal data from coconect.
                    </p>
                </div>
            </section>

            {/* CONTENT */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-[2rem] border-[4px] border-black shadow-[12px_12px_0_#111827]">

                    <div className="space-y-12 text-gray-700 font-medium text-lg">

                        <div>
                            <h2 className="text-2xl font-black uppercase text-[#111827] mb-4 border-b-[3px] border-black pb-2">Your Right to be Forgotten</h2>
                            <p className="mb-4">
                                At coconect, we believe your data belongs to you. In compliance with GDPR and Meta's Platform Terms, we provide a straightforward process for you to request the complete deletion of your personal data from our systems.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-black uppercase text-[#111827] mb-4 border-b-[3px] border-black pb-2">How to Request Deletion</h2>
                            <p className="mb-4">You can request data deletion using any of the following methods:</p>
                            
                            <div className="space-y-6">
                                <div className="bg-[#fafafa] p-6 rounded-xl border-[2px] border-gray-200">
                                    <h3 className="font-bold text-[#111827] mb-2">Option 1: Via WhatsApp (Automated)</h3>
                                    <p className="text-sm">
                                        Send the message <strong>"Delete my data"</strong> to our coconect WhatsApp bot. You will receive an automated confirmation message, and your account and associated data will be queued for deletion.
                                    </p>
                                </div>

                                <div className="bg-[#fafafa] p-6 rounded-xl border-[2px] border-gray-200">
                                    <h3 className="font-bold text-[#111827] mb-2">Option 2: Via the Web App</h3>
                                    <p className="text-sm">
                                        Log in to your account on the coconect web application, navigate to <strong>Profile Settings &gt; Privacy</strong>, and click the <strong>"Delete Account"</strong> button.
                                    </p>
                                </div>

                                <div className="bg-[#fafafa] p-6 rounded-xl border-[2px] border-gray-200">
                                    <h3 className="font-bold text-[#111827] mb-2">Option 3: Via Email</h3>
                                    <p className="text-sm">
                                        Send an email to <a href="mailto:privacy@coconect.app" className="text-[#e11d48] font-bold hover:underline">privacy@coconect.app</a> with the subject line <strong>"Data Deletion Request"</strong>. Please include the phone number associated with your account so we can identify you.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-black uppercase text-[#111827] mb-4 border-b-[3px] border-black pb-2">What Happens When You Request Deletion?</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Your profile will be immediately deactivated and no longer visible to others.</li>
                                <li>Your personal data (name, bio, preferences) will be permanently erased from our active databases within 30 days.</li>
                                <li>We will severe all connections between your phone number and our WhatsApp integration.</li>
                                <li>Some data may be retained for longer periods only if required for legal compliance or fraud prevention (e.g., records of financial transactions).</li>
                            </ul>
                        </div>

                        <div className="bg-[#fde047] text-black p-6 rounded-xl border-[2px] border-black font-bold">
                            Note: Once your data is deleted, it cannot be recovered. If you wish to use coconect again in the future, you will need to register as a new user.
                        </div>

                    </div>

                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-white pt-12 pb-12 border-t-[4px] border-black relative z-30">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">
                    <div className="font-black text-black text-4xl tracking-tighter">coconect:</div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        © 2026 coconect. All rights reserved.
                    </p>
                    <div className="flex gap-4 mt-2">
                        <Link href="/privacy" className="text-xs font-bold uppercase text-gray-500 hover:text-[#e11d48]">Privacy</Link>
                        <Link href="/terms" className="text-xs font-bold uppercase text-gray-500 hover:text-[#e11d48]">Terms</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
