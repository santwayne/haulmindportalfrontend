import React, { useEffect, useState } from "react";
import { Shield, Eye, EyeOff, CheckCircle, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginSuperAdmin } from "../../../axios/api/auth";
import { message } from "antd";
import { useDispatch } from "react-redux";
import { setSuperAdminCredentials } from "../../../redux/slices/superAdminSlice";
import { useSelector } from "react-redux";
import { type RootState } from "../../../redux/store";
import Logo from "../../../assets/FleetGo.png";

export default function SuperAdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { superAdminInfo } = useSelector((state: RootState) => state.superAdminAuth);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token && superAdminInfo && superAdminInfo.userData?.status === 'active') {
            navigate("/superadmin/dashboard");
        } else if (token && superAdminInfo && superAdminInfo.userData?.status !== 'active') {
            localStorage.removeItem('token');
            message.error('Your account is not active. Please contact administrator.');
        }
    }, [navigate, superAdminInfo]);

    useEffect(() => {
        if (success) {
            const t = window.setTimeout(() => {
                setSuccess(false);
                navigate("/superadmin/dashboard");
            }, 1500);
            return () => window.clearTimeout(t);
        }
    }, [success, navigate]);

    function validate() {
        const e: Record<string, string> = {};
        if (!email.trim()) e.email = "Email is required.";
        else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email.";
        if (!password.trim()) e.password = "Password is required.";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    const storeSuperAdminCredentials = (token: string, userData: any) => {
        localStorage.setItem("token", token);
        dispatch(setSuperAdminCredentials({ userData }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setErrors({});
        try {
            const response = await loginSuperAdmin({ email, password });
            if (!response || response.success !== true) {
                const errorMessage = response?.message || "Invalid super admin credentials. Access denied.";
                if (errorMessage.includes('not active') || errorMessage.includes('inactive')) {
                    localStorage.removeItem('token');
                }
                setErrors({ submit: errorMessage });
                message.error(errorMessage);
                setLoading(false);
                return;
            }
            if (response.success === true) {
                const userStatus = response.data?.status || 'active';
                if (userStatus !== 'active') {
                    const errorMsg = "Your account is not active. Please contact administrator.";
                    setErrors({ submit: errorMsg });
                    message.error(errorMsg);
                    setLoading(false);
                    return;
                }
                if (response.data?.token && response.data) {
                    storeSuperAdminCredentials(response.data.token, response.data);
                }
                setEmail("");
                setPassword("");
                setSuccess(true);
                message.success(response.message || "Login successful! Redirecting to dashboard...");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Network error. Please check your connection.";
            setErrors({ submit: msg });
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-8" style={{ fontFamily: 'var(--font-poppins)' }}>
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

                {/* Success toast */}
                {success && (
                    <div className="fixed top-6 right-6 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-slide-in z-50"
                        style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                        <CheckCircle className="w-5 h-5" />
                        Super Admin access granted!
                    </div>
                )}

                <div className="rounded-2xl shadow-2xl overflow-hidden card-premium"
                    style={{ border: '1px solid rgba(17,131,224,0.25)' }}>

                    {/* Header */}
                    <div className="relative p-8 text-center border-b"
                        style={{
                            background: 'linear-gradient(135deg, #091527 0%, #0d1e3a 50%, #091527 100%)',
                            borderColor: 'rgba(17,131,224,0.2)',
                        }}>
                        {/* Subtle shield watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                            <Shield className="w-48 h-48 text-white" />
                        </div>
                        <div className="relative">
                            <div className="w-18 h-18 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
                                style={{
                                    width: '72px', height: '72px',
                                    backgroundColor: 'var(--accent-navyblue)',
                                    boxShadow: '0 8px 24px rgba(17,131,224,0.4)',
                                }}>
                                <Shield className="w-9 h-9 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-futura)' }}>
                                Super Administrator
                            </h1>
                            <p className="text-sm" style={{ color: 'rgba(230,237,243,0.6)' }}>
                                Secure access to Logistiq platform
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-8 space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-primary">Super Administrator Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    placeholder="superadmin@logistiq.com"
                                    autoComplete="email"
                                    className={`block w-full rounded-lg border pl-11 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                                        errors.email ? 'border-red-400' : 'border-theme'
                                    }`}
                                    style={{ '--tw-ring-color': 'rgba(17,131,224,0.25)' } as React.CSSProperties}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.2)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-primary">Password</label>
                                <a
                                    href="/superadmin/forgot-password"
                                    className="text-xs hover:opacity-75 transition-opacity duration-200"
                                    style={{ color: 'var(--accent-navyblue)' }}
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    placeholder="Enter your secure password"
                                    autoComplete="current-password"
                                    className={`block w-full rounded-lg border pl-11 pr-11 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                                        errors.password ? 'border-red-400' : 'border-theme'
                                    }`}
                                    style={{ '--tw-ring-color': 'rgba(17,131,224,0.25)' } as React.CSSProperties}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.2)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                        </div>

                        {/* Submit error */}
                        {errors.submit && (
                            <div className="flex items-start gap-2 rounded-lg p-3 text-sm border"
                                style={{ backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.25)', color: '#F43F5E' }}>
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{errors.submit}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                                loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5 transform'
                            }`}
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}
                            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        {/* Security note */}
                        <p className="text-center text-xs text-secondary pt-1">
                            Restricted access — authorised personnel only
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center text-xs text-secondary">
          
                    © {new Date().getFullYear()} Logistiq Innovation Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
