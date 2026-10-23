import React, { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Building,
  X,
} from "lucide-react";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
} from "../../../../axios/api/auth";

interface UserProfile {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  role?: string;
  company?: any;
  profileImageUrl?: string;
  location?: { address?: string };
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

const ToastNotificationComponent = ({
  notifications,
  removeNotification,
}: {
  notifications: ToastNotification[];
  removeNotification: (id: string) => void;
}) => {
  const icons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    error: <XCircle className="text-red-500" size={24} />,
    info: <User className="text-blue-500" size={24} />,
    warning: <XCircle className="text-yellow-500" size={24} />,
  };
  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-card border-red-200",
    info: "bg-card border-blue-200",
    warning: "bg-card border-yellow-200",
  };
  return (
    <div className="fixed top-4 right-4 z-[10000] space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 shadow-lg ${bgColors[n.type]} min-w-[250px] max-w-[400px]`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[n.type]}</div>
          <p className="flex-1 text-sm font-medium text-headings">{n.message}</p>
          <button onClick={() => removeNotification(n.id)} className="flex-shrink-0 text-secondary hover:text-secondary">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const MechanicsProfile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [editForm, setEditForm] = useState<UserProfile>({});
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (type: "success" | "error" | "info" | "warning", message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setFetchLoading(true);
    try {
      const response = await getCurrentUserProfile();
      if (response?.success && response?.data) {
        setProfile(response.data);
        setEditForm(response.data);
      } else {
        addNotification("error", response?.message || "Failed to fetch profile");
      }
    } catch (error: any) {
      addNotification("error", error?.response?.data?.message || "Error fetching profile");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };


  const handleSaveProfile = async () => {
    if (!editForm.name?.trim()) {
      addNotification("error", "Name is required");
      return;
    }
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      addNotification("error", "Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const response = await updateCurrentUserProfile(editForm);
      if (response?.success && response?.data) {
        setProfile(response.data);
        setIsEditing(false);
        addNotification("success", "Profile updated successfully!");
      } else {
        addNotification("error", response?.message || "Failed to update profile");
      }
    } catch (error: any) {
      addNotification("error", error?.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      addNotification("error", "All password fields are required");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification("error", "New password and confirm password do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      addNotification("error", "Password must be at least 6 characters long");
      return;
    }
    setLoading(true);
    try {
      const response = await changePassword({ newPassword: passwordForm.newPassword });
      if (response?.success) {
        addNotification("success", "Password changed successfully!");
        setShowPasswordSection(false);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
      } else {
        addNotification("error", response?.message || "Failed to change password");
      }
    } catch (error: any) {
      addNotification("error", error?.response?.data?.message || "Error changing password");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleCancelPassword = () => {
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setShowPasswordSection(false);
  };

  if (fetchLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-16 bg-main min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)]" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-headings">My Profile</h1>
        <p className="text-sm text-secondary mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="px-4 py-3 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="text-[var(--accent-blue)]" size={20} />
              <h2 className="text-sm font-bold text-headings">Personal Information</h2>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 rounded-lg transition"
              >
                Edit Profile
              </button>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editForm.name || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.name || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editForm.email || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter your email"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.email || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter your phone"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.phone || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Role</label>
              <div className="px-3 py-2 bg-card rounded-lg">
                <span className="px-2 py-0.5 bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] rounded text-xs font-medium">
                  {profile.role || "Not set"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="px-4 py-3 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex items-center gap-2">
            <MapPin className="text-[var(--accent-navyblue)]" size={20} />
            <h2 className="text-sm font-bold text-headings">Location</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={editForm.location?.address || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter address"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.location?.address || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">City</label>
              {isEditing ? (
                <input
                  type="text"
                  name="city"
                  value={editForm.city || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter city"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.city || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">State / Province</label>
              {isEditing ? (
                <input
                  type="text"
                  name="state"
                  value={editForm.state || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter state"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.state || "Not set"}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Country</label>
              {isEditing ? (
                <input
                  type="text"
                  name="country"
                  value={editForm.country || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent text-sm"
                  placeholder="Enter country"
                />
              ) : (
                <div className="px-3 py-2 bg-card rounded-lg text-sm">{profile.country || "Not set"}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company (if exists) */}
      {profile.company && (
        <div className="mt-6 bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
            <Building className="text-[var(--accent-navyblue)]" size={20} />
            <h2 className="text-sm font-bold text-headings">Company</h2>
          </div>
          <div className="p-4">
            <div className="px-3 py-2 bg-card rounded-lg text-sm">
              {typeof profile.company === "object" ? profile.company.companyName : profile.company}
            </div>
          </div>
        </div>
      )}

      {/* Password Section */}
      <div className="mt-6 bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
        <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="text-[var(--accent-navyblue)]" size={20} />
            <h2 className="text-sm font-bold text-headings">Password</h2>
          </div>
          {!showPasswordSection && (
            <button
              onClick={() => setShowPasswordSection(true)}
              className="px-3 py-1.5 text-sm font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 rounded-lg transition"
            >
              Change Password
            </button>
          )}
        </div>
        {showPasswordSection && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-theme rounded-lg pr-10 text-sm"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-theme rounded-lg pr-10 text-sm"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordForm.newPassword && passwordForm.confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  {passwordForm.newPassword === passwordForm.confirmPassword ? (
                    <>
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-xs text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-red-500" />
                      <span className="text-xs text-[#A855F7]">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button onClick={handleCancelPassword} disabled={loading} className="px-4 py-2 text-headings bg-card hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-4 py-2 bg-[var(--accent-blue)] text-white hover:bg-[#3598c4] rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleCancelEdit} disabled={loading} className="px-4 py-2 text-primary bg-card hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="px-4 py-2 bg-[var(--accent-navyblue)] text-white hover:bg-[#3598c4] rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      <ToastNotificationComponent notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
};

export default MechanicsProfile;

