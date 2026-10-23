import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Save,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Building,
  X
} from 'lucide-react';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword
} from '../../../../axios/api/auth';
import { getFocusStyles } from '../../fleetMaintenance/colorUtils';
import { useDispatch, useSelector } from 'react-redux';
import { setUserCredentials } from '../../../../redux/slices/userSlice';
import type { RootState } from '../../../../redux/store';
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
  avatar?: string;
  location?: {
    address?: string;
    longitude?: string;
    latitude?: string;
  };
  details?: any;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notifications, removeNotification }: { notifications: ToastNotification[]; removeNotification: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    error: <XCircle className="text-red-500" size={24} />,
    info: <User className="text-[#1183e0]" size={24} />,
    warning: <XCircle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-[#00FFA3]/10 border-[#00FFA3]/30',
    error: 'bg-card border-red-500/30',
    info: 'bg-[rgba(17,131,224,0.08)] border-[rgba(17,131,224,0.25)]',
    warning: 'bg-card border-yellow-500/30'
  };

  return (
    <div className="fixed top-4 right-4 z-[10000] space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} min-w-[250px] max-w-[400px]`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {icons[notification.type]}
          </div>
          <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state: RootState) => state.userAuth);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({});
  const [editForm, setEditForm] = useState<UserProfile>({});

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const focusHandlers = getFocusStyles();
  const sharedInputProps = {
    ...focusHandlers,
    style: { border: `1px solid rgba(17, 131, 224, 0.2)`, background: '#0B1220', color: '#E6EDF3' }
  };
  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(17, 131, 224, 0.2)',
    boxShadow: `0 4px 20px rgba(17, 131, 224, 0.08)`,
    borderRadius: "20px",
  };
  const primaryButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #1a8ee8 0%, #1183e0 40%, #0d6bc7 100%)',
    color: "#fff",
    boxShadow: `0 8px 20px rgba(17, 131, 224, 0.25)`,
  };

  // Fetch user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setFetchLoading(true);
    try {
      const response = await getCurrentUserProfile();
      if (response && response.success) {
        setProfile(response.data);
        setEditForm(response.data);
      } else {
        console.error('Failed to fetch profile:', response);
        addNotification('error', response?.message || 'Failed to fetch profile');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      addNotification('error', error?.response?.data?.message || 'Error fetching profile');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!editForm.name || !editForm.name.trim()) {
      addNotification('error', 'Name is required');
      return;
    }

    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      addNotification('error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await updateCurrentUserProfile(editForm);
      if (response && response.success) {
        setProfile(response.data);
        setIsEditing(false);
        addNotification('success', 'Profile updated successfully!');

        // Sync updated name/email into Redux + localStorage so sidebar reflects immediately
        const updatedUserData = { ...userInfo?.userData, ...response.data };
        dispatch(setUserCredentials({ userData: updatedUserData }));
      } else {
        addNotification('error', response?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      addNotification('error', error?.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      addNotification('error', 'All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification('error', 'New password and confirm password do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      addNotification('error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        newPassword: passwordForm.newPassword
      });

      if (response && response.success) {
        addNotification('success', 'Password changed successfully!');
        setShowPasswordSection(false);
        setPasswordForm({
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        addNotification('error', response?.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      addNotification('error', error?.response?.data?.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleCancelPassword = () => {
    setPasswordForm({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordSection(false);
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-main">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#1183e0' }}></div>
          <p className="text-primary">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 bg-main">
      <div className="py-4">
        {/* Header */}
        <div className="bg-card p-4 mb-4" style={cardStyle}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#1183e0' }}>My Profile</h1>
              <p className="text-sm text-secondary">Manage your account information and preferences</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
                style={primaryButtonStyle}
              >
                <User size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Profile Information */}
            <div className="bg-card" style={cardStyle}>
              <div className="p-4 border-b border-[rgba(17,131,224,0.15)]">
                <div className="flex items-center gap-2">
                  <User style={{ color: '#1183e0' }} size={20} />
                  <h2 className="text-lg font-bold" style={{ color: '#1183e0' }}>Personal Information</h2>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter your full name"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.name || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter your email address"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.email || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter your phone number"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.phone || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Role</label>
                  <div className="px-3 py-2 bg-card rounded-lg">
                    <span className="px-3 py-0.5 bg-[rgba(17,131,224,0.15)] text-[#1183e0] rounded-full text-xs font-medium capitalize border border-[rgba(17,131,224,0.25)]">
                      {profile.role || 'Not set'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1">Role cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            {profile.company && (
              <div className="bg-card" style={cardStyle}>
                <div className="p-4 border-b border-[rgba(17,131,224,0.15)]">
                  <div className="flex items-center gap-2">
                    <Building style={{ color: '#1183e0' }} size={20} />
                    <h2 className="text-lg font-bold" style={{ color: '#1183e0' }}>Company Information</h2>
                  </div>
                </div>
                <div className="p-4">
                  <div className="px-3 py-2 bg-card rounded-lg">
                    <p className="text-primary font-medium text-sm">
                      {typeof profile.company === 'object' ? profile.company.companyName : profile.company}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Location Information */}
            <div className="bg-card" style={cardStyle}>
              <div className="p-4 border-b border-[rgba(17,131,224,0.15)]">
                <div className="flex items-center gap-2">
                  <MapPin style={{ color: '#1183e0' }} size={20} />
                  <h2 className="text-lg font-bold" style={{ color: '#1183e0' }}>Location Information</h2>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="country"
                      value={editForm.country || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter country"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.country || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">State</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="state"
                      value={editForm.state || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter state"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.state || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={editForm.city || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter city"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.city || 'Not set'}</p>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={editForm.location?.address || ''}
                      onChange={handleLocationChange}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all text-sm"
                      placeholder="Enter full address"
                      {...sharedInputProps}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-card rounded-lg">
                      <p className="text-primary font-medium text-sm">{profile.location?.address || 'Not set'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="bg-card" style={cardStyle}>
              <div className="p-4 border-b border-[rgba(17,131,224,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key style={{ color: '#1183e0' }} size={20} />
                    <h2 className="text-lg font-bold" style={{ color: '#1183e0' }}>Password</h2>
                  </div>
                  {!showPasswordSection && (
                    <button
                      onClick={() => setShowPasswordSection(true)}
                      className="px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                      style={{ border: `1px solid rgba(17, 131, 224, 0.35)`, color: '#1183e0' }}
                    >
                      <Key size={14} />
                      Change Password
                    </button>
                  )}
                </div>
              </div>

              {showPasswordSection && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all pr-10 text-sm"
                        placeholder="Enter new password"
                        {...sharedInputProps}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all pr-10 text-sm"
                        placeholder="Confirm new password"
                        {...sharedInputProps}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary"
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
                            <span className="text-xs text-red-400">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                    <button
                      onClick={handleCancelPassword}
                      disabled={loading}
                      className="px-3 py-1.5 text-secondary bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-2 text-sm disabled:opacity-50"
                      style={primaryButtonStyle}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="bg-card p-4 mt-4" style={cardStyle}>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="px-3 py-1.5 text-secondary bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-2 text-sm disabled:opacity-50"
                style={primaryButtonStyle}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastNotificationComponent
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </div>
  );
};

export default ProfilePage;
