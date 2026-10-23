import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { forgotPassword } from "../../../axios/api/auth";
import Logo from "../../../assets/FleetGo.png";

export default function ForgotPasswordPage() {
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
    <div
      className="min-h-screen bg-main flex items-center justify-center px-4 py-10"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-light)] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-75 transition-opacity"
          style={{ color: "var(--accent-navyblue)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </a>

        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden card-premium"
          style={{ borderColor: "rgba(17,131,224,0.2)" }}>

          {sent ? (
            /* ── Success state ── */
            <div className="p-10 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "rgba(17,131,224,0.15)", border: "1px solid rgba(17,131,224,0.3)" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "var(--accent-navyblue)" }} />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "var(--font-futura)" }}>
                Check your inbox
              </h2>
              <p className="text-sm text-secondary leading-relaxed mb-6">
                If <span className="text-primary font-medium">{email}</span> is registered, you'll receive a reset link
                shortly. The link expires in <span className="text-primary font-medium">1 hour</span>.
              </p>
              <p className="text-xs text-secondary leading-relaxed">
                Didn't get it? Check your spam folder or{" "}
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
              <div className="px-8 pt-8 pb-4 border-b" style={{ borderColor: "rgba(17,131,224,0.15)" }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                  style={{ backgroundColor: "var(--accent-navyblue)" }}
                >
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h2
                  className="text-2xl font-bold text-primary text-center mb-1"
                  style={{ fontFamily: "var(--font-futura)" }}
                >
                  Forgot Password?
                </h2>
                <p className="text-sm text-secondary text-center">
                  Enter your email and we'll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      disabled={loading}
                      placeholder="Enter your account email"
                      autoComplete="email"
                      className={`block w-full rounded-lg border pl-11 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                        error ? "border-red-400" : "border-theme"
                      }`}
                      style={{ "--tw-ring-color": "rgba(17,131,224,0.25)" } as React.CSSProperties}
                      onFocus={(e) => { e.target.style.borderColor = "var(--accent-navyblue)"; e.target.style.boxShadow = "0 0 0 2px rgba(17,131,224,0.2)"; }}
                      onBlur={(e) => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
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
                    loading ? "opacity-60 cursor-not-allowed" : "hover:shadow-xl hover:-translate-y-0.5 transform"
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
                      href="/"
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

        <div className="mt-8 text-center text-xs text-secondary">
          <img src={Logo} alt="Logistiq" className="h-6 w-auto mx-auto mb-2 opacity-60" />
          © {new Date().getFullYear()} Logistiq Innovation Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
