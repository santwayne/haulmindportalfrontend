import React, {  useState } from "react";
import { Truck, MapPin, Users, Shield, CheckCircle, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Phone, Building2, FileCheck, HeartPulse, ChevronDown, ChevronUp } from "lucide-react";
import { registerAdmin } from "../../../axios/api/auth";
import { getCompany } from "../../../axios/api/admin";
import { useNavigate, Link } from "react-router-dom";
import { message } from 'antd';
import { setUserCredentials } from "../../../redux/slices/userSlice";
import { useDispatch } from "react-redux";
import { PublicHeader } from "../../../components/auth/PublicHeader";
import { PublicFooter } from "../../../components/auth/PublicFooter";

export default function RegistrationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Remove the old useEffect that navigates to login

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email.";
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    if (!agree) e.agree = "You must accept the terms.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function passwordStrength() {
    if (password.length >= 12 && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password))
      return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
    if (password.length >= 9) return { label: "Medium", color: "bg-yellow-400", width: "w-2/3" };
    if (password.length > 0) return { label: "Weak", color: "bg-red-400", width: "w-1/3" };
    return { label: "", color: "", width: "w-0" };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        name,
        email,
        password,
        phone: phone || undefined,
        country: country || undefined,
        state: state || undefined,
        city: city || undefined,
        address: address || undefined,
      };

      const response = await registerAdmin(payload);
      
      if (response && response.success === true) {
        const token = response.token || response.data?.token || response.data?.accessToken;
        const userData = response.data || response;

        if (!token || !userData) {
          const errorMsg = "Registration successful but failed to get authentication token. Please login.";
          setErrors({ submit: errorMsg });
          message.error(errorMsg);
          setLoading(false);
          // Navigate to login after a delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
          return;
        }

        // Clean up old localStorage keys
        localStorage.removeItem('adminInfo');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');

        // Persist the token immediately
        localStorage.setItem("token", token);
        sessionStorage.setItem("tokenSetTime", Date.now().toString());

        // Normalize user data
        const rawCompany = userData.company || userData.companyId || userData.companyInfo || userData.companyData;

        let normalizedCompany: any = undefined;
        if (rawCompany) {
          if (typeof rawCompany === 'string') {
            normalizedCompany = { _id: rawCompany };
          } else if (typeof rawCompany === 'object') {
            const companyId = rawCompany._id || rawCompany.id;
            normalizedCompany = {
              _id: companyId,
              companyName: rawCompany.companyName || rawCompany.name,
              ...rawCompany,
            };
          }
        } else if (userData.role && userData.role !== 'superadmin') {
          try {
            const companyResponse = await getCompany();
            if (companyResponse?.success && companyResponse?.data?._id) {
              const companyData = companyResponse.data;
              normalizedCompany = {
                _id: companyData._id,
                companyName: companyData.companyName || companyData.name,
                ...companyData,
              };
            }
          } catch (companyError) {
            console.warn('Unable to fetch company details during registration:', companyError);
          }
        }

        const normalizedUserData = {
          _id: userData.id || userData._id,
          name: userData.name || userData.email,
          email: userData.email,
          role: userData.role || 'admin',
          status: userData.status || 'active',
          company: normalizedCompany,
        };

        const userInfoPayload = {
          userData: normalizedUserData,
          role: normalizedUserData.role,
          company: normalizedUserData.company,
        };

        // Store authentication data
        localStorage.setItem("userInfo", JSON.stringify(userInfoPayload));

        // Update Redux
        dispatch(setUserCredentials(userInfoPayload));

        // Show success message
        message.success({
          content: response.message || 'Account created successfully! Your 1-month free trial has started.',
          duration: 3,
        });

        // Mark fresh session so training pages redirect to dashboard first
        sessionStorage.setItem('showDashboardFirst', 'true');

        // Navigate to admin dashboard after a short delay
        setTimeout(() => {
          navigate('/admin/dashboard', { replace: true });
        }, 1500);
      } else {
        const errorMessage = response?.message || "Registration failed. Please try again.";
        setErrors({ submit: errorMessage });
        message.error(errorMessage);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || err?.message || "Unexpected error, try again.";
      setErrors({ submit: errorMessage });
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-main)", fontFamily: 'var(--font-poppins)' }}>
      <PublicHeader />

      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-light)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8 relative" style={{ zIndex: 1 }}>
      <div className="w-full max-w-6xl relative">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left Side - Branding & Features (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo & Header */}
            <div className="text-center lg:text-left">
              {/* <img src={Logo} alt="FleetGo Logo" className="w-32 h-auto mb-6 mx-auto lg:mx-0" style={{ width: 'calc(8rem * 0.98)', marginBottom: 'calc(1.5rem * 0.98)' }} /> */}
              
              {/* Highlighted 1-month free trial badge */}
              <div className="mb-4 flex items-center justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md" style={{ backgroundColor: 'var(--accent-navyblue)', fontSize: 'calc(0.875rem * 0.98)' }}>
                  <CheckCircle className="w-4 h-4" style={{ width: 'calc(1rem * 0.98)', height: 'calc(1rem * 0.98)' }} />
                  1-Month Free Trial
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight text-primary" style={{ fontFamily: 'var(--font-futura)' }}>
                Start Your Free Trial
              </h1>
              <p className="text-base text-secondary leading-relaxed" style={{ fontSize: 'calc(1rem * 0.98)' }}>
                Join thousands of companies managing their fleet operations efficiently with Logistiq Platform.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-4 rounded-2xl p-6 border" style={{ padding: 'calc(1.5rem * 0.98)', backgroundColor: 'rgba(18, 26, 43, 0.85)', borderColor: 'rgba(17, 131, 224, 0.2)' }}>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>What's Included</h3>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                  <Truck className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Fleet Management</h4>
                  <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>Real-time vehicle tracking and comprehensive fleet oversight</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                  <MapPin className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Route Optimization</h4>
                  <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>AI-powered route planning to reduce costs and improve efficiency</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                  <Users className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Team Collaboration</h4>
                  <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>Seamless communication and coordination across your organization</p>
                </div>
              </div>

              {/* Additional Features - Shown when "View More" is clicked */}
              {showMoreFeatures && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                      <FileCheck className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Compliance Management</h4>
                      <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>Track regulatory compliance, certifications, and audit requirements</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                      <HeartPulse className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Health & Safety Management</h4>
                      <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>Manage safety protocols, incident reporting, and health compliance</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)', width: 'calc(2.5rem * 0.98)', height: 'calc(2.5rem * 0.98)' }}>
                      <Shield className="w-5 h-5 text-white" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>Security & Access Control</h4>
                      <p className="text-xs text-secondary leading-relaxed" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>Enterprise-grade security with role-based access control</p>
                    </div>
                  </div>
                </>
              )}

              {/* View More Button */}
              <button
                type="button"
                onClick={() => setShowMoreFeatures(!showMoreFeatures)}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary transition-colors pt-2 border-t border-theme"
                style={{ fontSize: 'calc(0.875rem * 0.98)', color: 'var(--accent-navyblue)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0d6fc7'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-navyblue)'}
              >
                {showMoreFeatures ? (
                  <>
                    View Less
                    <ChevronUp className="w-4 h-4" style={{ width: 'calc(1rem * 0.98)', height: 'calc(1rem * 0.98)' }} />
                  </>
                ) : (
                  <>
                    View More
                    <ChevronDown className="w-4 h-4" style={{ width: 'calc(1rem * 0.98)', height: 'calc(1rem * 0.98)' }} />
                  </>
                )}
              </button>
            </div>

            {/* Trial Info */}
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(18, 26, 43, 0.85)', borderColor: 'rgba(17, 131, 224, 0.2)' }}>
              <p className="text-xs text-primary leading-relaxed flex items-center gap-2" style={{ fontSize: 'calc(0.75rem * 0.98)' }}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white" style={{ backgroundColor: 'var(--accent-navyblue)', fontSize: 'calc(0.75rem * 0.98)' }}>
                
                  <span>1-Month Free Trial</span>
                </span>
                <span className="text-secondary">No credit card required</span>
              </p>
            </div>
          </div>

          {/* Right Side - Registration Form (3 columns) */}
          <div className="lg:col-span-3">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-theme overflow-hidden card-premium">
              {/* Form Header */}
              <div className="px-8 pt-6 border-b border-theme">
                <h2 className="text-2xl font-bold text-primary mb-1" style={{ fontFamily: 'var(--font-futura)' }}>Create Account</h2>
                <p className="text-sm text-secondary">Set up your admin profile to get started</p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="p-8" style={{ padding: 'calc(2rem * 0.98)' }}>
                <div className="space-y-6" style={{ gap: 'calc(1.5rem * 0.98)' }}>
                  {/* Personal Information Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-4" style={{ fontSize: 'calc(0.75rem * 0.98)', marginBottom: 'calc(1rem * 0.98)' }}>Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Full Name *</label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`block w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
                              errors.name ? "border-red-400 bg-card focus:ring-red-200" : "border-theme hover:border-theme"
                            }`}
                            style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                            placeholder="John Doe"
                          />
                        </div>
                        {errors.name && <p className="text-xs text-red-500 mt-1" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{errors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Email Address *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`block w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
                              errors.email ? "border-red-400 bg-card focus:ring-red-200" : "border-theme hover:border-theme"
                            }`}
                            style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                            placeholder="john@company.com"
                          />
                        </div>
                        {errors.email && <p className="text-xs text-red-500 mt-1" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{errors.email}</p>}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Phone Number (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full rounded-lg border border-theme pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent hover:border-theme"
                          style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location Information Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-4" style={{ fontSize: 'calc(0.75rem * 0.98)', marginBottom: 'calc(1rem * 0.98)' }}>Location (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Country</label>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="block w-full rounded-lg border border-theme px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent hover:border-theme"
                          style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                          placeholder="United States"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>State</label>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="block w-full rounded-lg border border-theme px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent hover:border-theme"
                          style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                          placeholder="California"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>City</label>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="block w-full rounded-lg border border-theme px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent hover:border-theme"
                          style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                          placeholder="Los Angeles"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Street Address</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                        <input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="block w-full rounded-lg border border-theme pl-10 pr-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent hover:border-theme"
                          style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                          placeholder="123 Main Street"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-4" style={{ fontSize: 'calc(0.75rem * 0.98)', marginBottom: 'calc(1rem * 0.98)' }}>Security</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`block w-full rounded-lg border pl-10 pr-10 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
                              errors.password ? "border-red-400 bg-card focus:ring-red-200" : "border-theme hover:border-theme"
                            }`}
                            style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                            placeholder="Create strong password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-secondary"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} /> : <Eye className="w-4 h-4" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />}
                          </button>
                        </div>
                        
                        {/* Password Strength */}
                        {password && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength().color} ${passwordStrength().width}`}></div>
                              </div>
                              <span className="text-xs font-medium text-secondary min-w-[60px] text-right" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{passwordStrength().label}</span>
                            </div>
                            <p className="text-xs text-secondary" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>Use 12+ characters with uppercase, numbers, and symbols</p>
                          </div>
                        )}
                        {errors.password && <p className="text-xs text-red-500 mt-1" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{errors.password}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>Confirm Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className={`block w-full rounded-lg border pl-10 pr-10 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
                              errors.confirm ? "border-red-400 bg-card focus:ring-red-200" : "border-theme hover:border-theme"
                            }`}
                            style={{ '--tw-ring-color': 'rgba(17, 131, 224, 0.3)', fontSize: 'calc(0.875rem * 1.005)', paddingTop: 'calc(0.625rem * 1.005)', paddingBottom: 'calc(0.625rem * 1.005)' } as React.CSSProperties}
                            placeholder="Re-enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-secondary"
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} /> : <Eye className="w-4 h-4" style={{ width: 'calc(1rem * 1.005)', height: 'calc(1rem * 1.005)' }} />}
                          </button>
                        </div>
                        {errors.confirm && <p className="text-xs text-red-500 mt-1" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{errors.confirm}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Terms & Submit */}
                  <div className="space-y-4 pt-4 border-t border-theme">
                    <div className="flex items-start gap-3">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        className={`mt-1 h-4 w-4 rounded border-theme ${
                          errors.agree ? "border-red-400" : ""
                        }`}
                        style={{ accentColor: 'var(--accent-navyblue)' }}
                      />
                      <label htmlFor="terms" className="text-sm text-primary leading-relaxed" style={{ fontSize: 'calc(0.875rem * 1.005)' }}>
                        I agree to the{" "}
                        <a className="font-medium underline hover:no-underline" href="#" style={{ color: 'var(--accent-navyblue)' }}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a className="font-medium underline hover:no-underline" href="#" style={{ color: 'var(--accent-navyblue)' }}>
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {errors.agree && <p className="text-xs text-red-500 ml-7" style={{ fontSize: 'calc(0.75rem * 1.005)' }}>{errors.agree}</p>}

                    {errors.submit && (
                      <div className="bg-card border border-red-200 rounded-lg p-3 flex items-start gap-2" style={{ padding: 'calc(0.75rem * 0.98)' }}>
                        <AlertCircle className="w-4 h-4 text-[#A855F7] flex-shrink-0 mt-0.5" style={{ width: 'calc(1rem * 0.98)', height: 'calc(1rem * 0.98)' }} />
                        <p className="text-sm text-[#A855F7]" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>{errors.submit}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold !text-white shadow-md transition-all duration-200 ${
                        loading 
                          ? "cursor-not-allowed opacity-60" 
                          : "hover:shadow-lg transform hover:-translate-y-0.5"
                      }`}
                      style={loading ? { backgroundColor: 'var(--accent-navyblue)', opacity: 0.6, fontSize: 'calc(0.875rem * 0.98)', paddingTop: 'calc(0.75rem * 0.98)', paddingBottom: 'calc(0.75rem * 0.98)' } : { backgroundColor: 'var(--accent-navyblue)', fontSize: 'calc(0.875rem * 0.98)', paddingTop: 'calc(0.75rem * 0.98)', paddingBottom: 'calc(0.75rem * 0.98)' }}
                      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{ width: 'calc(1.25rem * 0.98)', height: 'calc(1.25rem * 0.98)' }}></div>
                          Creating Your Account...
                        </>
                      ) : (
                        <>
                          Create Account & Start Trial
                          <ArrowRight className="w-4 h-4" style={{ width: 'calc(1rem * 0.98)', height: 'calc(1rem * 0.98)' }} />
                        </>
                      )}
                    </button>

                    <p className="text-center text-sm text-secondary !mt-2" style={{ fontSize: 'calc(0.875rem * 0.98)' }}>
                      Already have an account?{" "}
                      <Link to="/" className="font-semibold underline hover:no-underline" style={{ color: 'var(--accent-navyblue)' }}>
                        Sign in
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>

        
          </div>
        </div>

      </div>
      </main>

      <PublicFooter />

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}