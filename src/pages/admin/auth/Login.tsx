import React, { useEffect, useState } from "react";
import { Truck, Eye, EyeOff, Mail, Lock, ArrowRight, MapPin, Users, AlertCircle } from "lucide-react";
import { login } from "../../../axios/api/auth";
import { getCompany } from "../../../axios/api/admin";
import { useNavigate, useLocation } from "react-router-dom";
import { message } from 'antd';
import { setUserCredentials } from "../../../redux/slices/userSlice";
import { useDispatch } from "react-redux";
import { PublicHeader } from "../../../components/auth/PublicHeader";
import { PublicFooter } from "../../../components/auth/PublicFooter";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in (only check once on mount)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserInfo = localStorage.getItem('userInfo');

    // Only redirect if we have both token and userInfo, and user is active
    if (location.pathname === '/' && token && storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        if (parsed && parsed.userData && parsed.userData.role && parsed.userData.status === 'active') {
          // Redirect based on role
          const userRole = parsed.userData.role;
          if (userRole === 'dispatcher') {
            navigate('/dispatch', { replace: true });
          } else if (userRole === 'hr') {
            navigate('/Management', { replace: true });
          } else if (userRole === 'accountant') {
            navigate('/accounts', { replace: true });
          } else if (userRole === 'Fleet Maintenance Manager') {
            navigate('/fleetmaintenance', { replace: true });
          } else if (userRole === 'Compliance Manager') {
            navigate('/compliance', { replace: true });
          } else if (userRole === 'safety officer') {
            navigate('/healthandsafety', { replace: true });
          } else if (userRole === 'Maintenance Crew (Mechanics)') {
            navigate('/mechanics/dashboard', { replace: true });
          } else {
            navigate('/admin/dashboard', { replace: true });
          }
        } else if (parsed && parsed.userData && parsed.userData.status !== 'active') {
          // Clear inactive user's data
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          message.error('Your account is not active. Please contact administrator.');
        }
      } catch (e) {
        // Invalid userInfo, don't redirect
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email.";
    if (!password.trim()) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await login({ email, password });

      // Check if response indicates an error - if success is false, show error and stop
      if (!response || response.success !== true) {
        const errorMessage = response?.message || "Invalid credentials. Please try again.";

        // Clear any existing tokens if account is inactive
        if (errorMessage.includes('not active') || errorMessage.includes('inactive')) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
        }

        setErrors({ submit: errorMessage });
        message.error(errorMessage);
        setLoading(false);
        return; // Stop here - do NOT navigate to dashboard
      }

      // Only proceed if response.success is explicitly true
      if (response.success === true) {
        const token = response.token || response.data?.token || response.data?.accessToken;
        const userData = response.data || response.user || response;

        if (!token || !userData) {
          const errorMsg = "Invalid response from server. Please try again.";
          setErrors({ submit: errorMsg });
          message.error(errorMsg);
          setLoading(false);
          return; // Stop here - do NOT navigate to dashboard
        }

        // Double-check user status before allowing login
        const userStatus = userData.status || userData.userData?.status || 'active';
        if (userStatus !== 'active') {
          setErrors({ submit: "Your account is not active. Please contact administrator." });
          message.error("Your account is not active. Please contact administrator.");
          setLoading(false);
          return;
        }

        // Clean up old localStorage keys
        localStorage.removeItem('adminInfo');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');

        // Persist the new token immediately so subsequent API calls succeed
        localStorage.setItem("token", token);
        sessionStorage.setItem("tokenSetTime", Date.now().toString());
        localStorage.setItem("loginTimestamp", Date.now().toString());

        // Normalize user data
        const rawCompany =
          userData.company ||
          userData.companyId ||
          userData.companyInfo ||
          userData.companyData ||
          userData?.userData?.company;

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
            console.warn('Unable to fetch company details during login:', companyError);
          }
        }

        const normalizedUserData = {
          _id: userData._id || userData.id,
          name:
            userData.name ||
            `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
            userData.email,
          email: userData.email,
          role: userData.role,
          status: userStatus, // Use the checked status
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

        // Clear form and show success
        setEmail("");
        setPassword("");
        setRememberMe(false);
        message.success(response.message || "Login successful");

        // Mark that this is a fresh login session — training pages must not be shown
        // before the user has visited their dashboard first
        sessionStorage.setItem('showDashboardFirst', 'true');

        // Navigate based on user role
        const userRole = normalizedUserData.role || userData.role;
        if (userRole === 'dispatcher') {
          navigate('/dispatch', { replace: true });
        } else if (userRole === 'hr') {
          navigate('/Management', { replace: true });
        } else if (userRole === 'accountant') {
          navigate('/accounts', { replace: true });
        } else if (userRole === 'Fleet Maintenance Manager') {
          navigate('/fleetmaintenance', { replace: true });
        } else if (userRole === 'Compliance Manager') {
          navigate('/compliance', { replace: true });
        } else if (userRole === 'safety officer') {
          navigate('/healthandsafety', { replace: true });
        } else if (userRole === 'Maintenance Crew (Mechanics)') {
          navigate('/admin/mechanics/orders', { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
        setLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Network error. Please check your connection and try again.";
      setErrors({ submit: errorMessage });
      message.error(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-main)", fontFamily: 'var(--font-poppins)' }}>
      <PublicHeader />

      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-light)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-6 relative" style={{ zIndex: 1 }}>
      <div className="w-full max-w-6xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Welcome Content */}
          <div className="space-y-5 text-center lg:text-left">
            <div>
              {/* <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <img src={Logo} alt="Logo" className="w-28 h-auto" />
              </div> */}
              <p className="text-sm text-secondary max-w-md mx-auto lg:mx-0">
                Sign in to access your logistics dashboard and manage your operations efficiently.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-4 hover:shadow-lg transition-all duration-300" style={{ backgroundColor: 'rgba(18, 26, 43, 0.85)', border: '1px solid rgba(17, 131, 224, 0.2)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-xs text-primary mb-1">Fleet Tracking</h4>
                <p className="text-xs text-secondary">Real-time vehicle monitoring</p>
              </div>

              <div className="rounded-xl p-4 hover:shadow-lg transition-all duration-300" style={{ backgroundColor: 'rgba(18, 26, 43, 0.85)', border: '1px solid rgba(17, 131, 224, 0.2)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-xs text-primary mb-1">Route Planning</h4>
                <p className="text-xs text-secondary">Optimized delivery routes</p>
              </div>

              <div className="rounded-xl p-4 hover:shadow-lg transition-all duration-300" style={{ backgroundColor: 'rgba(18, 26, 43, 0.85)', border: '1px solid rgba(17, 131, 224, 0.2)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-xs text-primary mb-1">Team Management</h4>
                <p className="text-xs text-secondary">Driver & staff coordination</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form (Larger) */}
          <div className="w-full max-w-lg mx-auto  ">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-theme overflow-hidden card-premium">
              {/* Form Header */}
              <div className="pt-8 pb-1 text-center border-b border-theme">
                <div className="w-14 h-14 mb-1 rounded-xl flex items-center justify-center mx-auto shadow-lg" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary !mb-1" style={{ fontFamily: 'var(--font-futura)' }}>Sign In</h3>
                <p className="text-sm text-secondary">Access your logistics dashboard</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className={`block w-full rounded-lg border pl-11 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${errors.email ? "border-red-400 bg-card" : "border-theme hover:border-theme"
                        }`}
                      style={{ '--tw-ring-color': 'var(--accent-navyblue)' } as React.CSSProperties & { '--tw-ring-color': string }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17, 131, 224, 0.2)'; }}
                      onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <div className="text-sm text-red-500 mt-1">{errors.email}</div>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-primary">Password</label>
                    <a
                      href="/forgot-password"
                      className="text-xs hover:opacity-75 transition-opacity duration-200"
                      style={{ color: 'var(--accent-navyblue)' }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className={`block w-full rounded-lg border pl-11 pr-11 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${errors.password ? "border-red-400 bg-card" : "border-theme hover:border-theme"
                        }`}
                      style={{ '--tw-ring-color': 'var(--accent-navyblue)' } as React.CSSProperties & { '--tw-ring-color': string }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17, 131, 224, 0.2)'; }}
                      onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-secondary disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <div className="text-sm text-red-500 mt-1">{errors.password}</div>}
                </div>


                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-theme disabled:opacity-50"
                      style={{ accentColor: 'var(--accent-navyblue)' }}
                    />
                    <label htmlFor="remember" className="text-sm text-secondary">
                      Remember me
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="space-y-4">
                  {errors.submit && (
                    <div className="text-sm text-[#A855F7] text-center bg-card border border-red-200 p-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errors.submit}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold !text-white shadow-lg transition-all duration-200 ${loading
                      ? "cursor-not-allowed opacity-60"
                      : "hover:shadow-xl transform hover:-translate-y-0.5"
                      }`}
                    style={loading ? {} : { backgroundColor: 'var(--accent-navyblue)' }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>



                {/* Sign Up Link */}
                <div className="text-center pt-3 border-t border-theme">
                  <p className="text-sm text-secondary">
                    Don't have an account?{" "}
                    <a
                      href="/admin/register"
                      className="font-medium underline hover:opacity-80 transition-all duration-200"
                      style={{ color: 'var(--accent-navyblue)' }}
                    >
                      Create one now
                    </a>
                  </p>
                </div>
              </form>
            </div>

          </div>
        </div>

      </div>
      </main>

      <PublicFooter />
    </div>
  );
}