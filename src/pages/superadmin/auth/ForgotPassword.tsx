import React, { useState } from "react";
import { Shield, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { forgotPassword } from "../../../axios/api/auth";
import Logo from "../../../assets/FleetGo.png";

export default function SuperAdminForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) { setError("Email address is required."); return; }
        if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email address."); return; }

        setLoading(true);
        setError("");
        try {
            const res = await forgotPassword({ email: email.trim().toLowerCase() });
            if (res.success) {
                setSent(true);
            } else {
                setError(res.message || "Something went wrong. Please try again.");
            }
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-10"
            style={{ fontFamily: "var(--font-poppins)" }}>
            {/* Background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(17,131,224,0.06), rgba(17,131,224,0.03))' }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000"
                    style={{ background: 'linear-gradient(135deg, rgba(17,131,224,0.04), rgba(17,131,224,0.08))' }} />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img src={Logo} alt="Logistiq" className="w-36 h-auto" />
                </div>

                {/* Back link */}
                <a
                    href="/superadmin/login"
                    className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-75 transition-opacity"
                    style={{ color: "var(--accent-navyblue)" }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Super Admin Sign In
                </a>

                <div className="rounded-2xl shadow-2xl overflow-hidden card-premium"
                    style={{ border: '1px solid rgba(17,131,224,0.25)' }}>

                    {sent ? (
                        /* ── Success state ── */
                        <div className="p-10 text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                                style={{ backgroundColor: "rgba(17,131,224,0.12)", border: "1px solid rgba(17,131,224,0.3)" }}>
                                <CheckCircle className="w-8 h-8" style={{ color: "var(--accent-navyblue)" }} />
                            </div>
                            <h2 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "var(--font-futura)" }}>
                                Check your inbox
                            </h2>
                            <p className="text-sm text-secondary leading-relaxed mb-6">
                                If <span className="text-primary font-medium">{email}</span> is registered, a reset link has been
                                sent. The link expires in <span className="text-primary font-medium">1 hour</span>.
                            </p>
                            <p className="text-xs text-secondary leading-relaxed">
                                Didn't receive it? Check spam or{" "}
                                <button
                                    onClick={() => { setSent(false); setEmail(""); }}
                                    className="underline hover:opacity-75 transition-opacity"
                                    style={{ color: "var(--accent-navyblue)" }}
                                >
                                    try a different email
                                </button>
                                .
                            </p>
                        </div>
                    ) : (
                        /* ── Form state ── */
                        <>
                            {/* Header */}
                            <div className="relative p-8 text-center border-b"
                                style={{
                                    background: 'linear-gradient(135deg, #091527 0%, #0d1e3a 50%, #091527 100%)',
                                    borderColor: 'rgba(17,131,224,0.2)',
                                }}>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                                    <Shield className="w-48 h-48 text-white" />
                                </div>
                                <div className="relative">
                                    <div className="mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
                                        style={{
                                            width: '64px', height: '64px',
                                            backgroundColor: 'var(--accent-navyblue)',
                                            boxShadow: '0 8px 24px rgba(17,131,224,0.4)',
                                        }}>
                                        <Mail className="w-7 h-7 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-futura)' }}>
                                        Reset Password
                                    </h2>
                                    <p className="text-sm" style={{ color: 'rgba(230,237,243,0.6)' }}>
                                        We'll send a secure reset link to your email.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-primary">Super Administrator Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                            disabled={loading}
                                            placeholder="superadmin@logistiq.com"
                                            autoComplete="email"
                                            className={`block w-full rounded-lg border pl-11 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                                                error ? 'border-red-400' : 'border-theme'
                                            }`}
                                            style={{ '--tw-ring-color': 'rgba(17,131,224,0.25)' } as React.CSSProperties}
                                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.2)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                                        />
                                    </div>
                                    {error && (
                                        <div className="flex items-center gap-2 text-sm text-red-400 mt-1">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                                        loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5 transform'
                                    }`}
                                    style={{ backgroundColor: "var(--accent-navyblue)" }}
                                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#0d6fc7"; }}
                                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--accent-navyblue)"; }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending Reset Link...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </button>

                                <div className="text-center pt-2 border-t" style={{ borderColor: "rgba(17,131,224,0.12)" }}>
                                    <p className="text-sm text-secondary">
                                        Remembered your password?{" "}
                                        <a
                                            href="/superadmin/login"
                                            className="font-medium underline hover:opacity-75 transition-opacity"
                                            style={{ color: "var(--accent-navyblue)" }}
                                        >
                                            Sign in
                                        </a>
                                    </p>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-6 text-center text-xs text-secondary">

                    © {new Date().getFullYear()} Logistiq Innovation Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
