import React, { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import { acceptInvite } from "../../../axios/api/auth";
import Logo from "../../../assets/FleetGo.png";

function passwordStrength(pw: string) {
  if (!pw) return { label: "", color: "", width: "w-0" };
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw))
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  if (pw.length >= 9) return { label: "Medium", color: "bg-yellow-400", width: "w-2/3" };
  return { label: "Weak", color: "bg-red-400", width: "w-1/3" };
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!token) { setErrors({ submit: "Invalid invite link." }); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await acceptInvite(token, { password });
      if (res.success) {
        // Clear any existing admin session so the correct role dashboard loads after sign-in
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        setDone(true);
        message.success("Account activated! You can now sign in.");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      } else {
        setErrors({ submit: res.message || "This invite link may have expired. Please contact your administrator." });
      }
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <div
      className="min-h-screen bg-main flex items-center justify-center px-4 py-10"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-light)] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md relative">
        <div
          className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden card-premium"
          style={{ borderColor: "rgba(17,131,224,0.2)" }}
        >
          {done ? (
            <div className="p-10 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "rgba(17,131,224,0.15)", border: "1px solid rgba(17,131,224,0.3)" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "var(--accent-navyblue)" }} />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "var(--font-futura)" }}>
                Account Activated!
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                Your password has been set. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <div className="px-8 pt-8 pb-4 border-b" style={{ borderColor: "rgba(17,131,224,0.15)" }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                  style={{ backgroundColor: "var(--accent-navyblue)" }}
                >
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-primary text-center mb-1" style={{ fontFamily: "var(--font-futura)" }}>
                  Accept Invitation
                </h2>
                <p className="text-sm text-secondary text-center">
                  Set a password to activate your Logistiq account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                      disabled={loading}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className={`block w-full rounded-lg border pl-11 pr-11 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${errors.password ? "border-red-400" : "border-theme"}`}
                      style={{ "--tw-ring-color": "rgba(17,131,224,0.25)" } as React.CSSProperties}
                      onFocus={(e) => { e.target.style.borderColor = "var(--accent-navyblue)"; e.target.style.boxShadow = "0 0 0 2px rgba(17,131,224,0.2)"; }}
                      onBlur={(e) => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                          <div className={`h-1.5 rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                        </div>
                        <span className="text-xs text-secondary w-14 text-right">{strength.label}</span>
                      </div>
                      <p className="text-xs text-secondary">Use 12+ characters with uppercase, numbers &amp; symbols.</p>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErrors({}); }}
                      disabled={loading}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className={`block w-full rounded-lg border pl-11 pr-11 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${errors.confirm ? "border-red-400" : "border-theme"}`}
                      style={{ "--tw-ring-color": "rgba(17,131,224,0.25)" } as React.CSSProperties}
                      onFocus={(e) => { e.target.style.borderColor = "var(--accent-navyblue)"; e.target.style.boxShadow = "0 0 0 2px rgba(17,131,224,0.2)"; }}
                      onBlur={(e) => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors">
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-red-400">{errors.confirm}</p>}
                </div>

                {errors.submit && (
                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm border" style={{ backgroundColor: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.25)", color: "#F43F5E" }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errors.submit}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${loading ? "opacity-60 cursor-not-allowed" : "hover:shadow-xl hover:-translate-y-0.5 transform"}`}
                  style={{ backgroundColor: "var(--accent-navyblue)" }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#0d6fc7"; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--accent-navyblue)"; }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      Activate Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2 border-t" style={{ borderColor: "rgba(17,131,224,0.12)" }}>
                  <a href="/" className="text-sm hover:opacity-75 transition-opacity" style={{ color: "var(--accent-navyblue)" }}>
                    Back to Sign In
                  </a>
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
