import React from 'react';
import { Camera, Mail, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfileMutation } from '../store/api/usersApi';
import { useChangePasswordMutation } from '../store/api/authApi';
import Button from '../components/common/Button';
import { formatDate, getInitials } from '../utils/formatters';
// import { formatDate, getInitials, ROLE_LABELS } from '../utils/formatters';
import { ROLE_COLORS } from '../utils/constants';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axiosInstance from '../utils/axiosInstance';
import { useDispatch } from 'react-redux';
import { updateUser } from '../store/slices/authSlice';

const Profile = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();

  const { register: regProfile, handleSubmit: handleProfile } = useForm({
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName }
  });

  const { register: regPw, handleSubmit: handlePw, reset: resetPw, watch } = useForm();

  const onProfileSubmit = async (data) => {
    try {
      await updateProfile(data).unwrap();
      dispatch(updateUser({ firstName: data.firstName, lastName: data.lastName }));
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }).unwrap();
      toast.success('Password changed successfully!');
      resetPw();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to change password');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axiosInstance.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      dispatch(updateUser({ avatarUrl: res.data.data.avatarUrl }));
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your account settings</p>
      </div>

      {/* Avatar & Basic Info */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white', overflow: 'hidden' }}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user?.firstName, user?.lastName)}
            </div>
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-card)' }}>
              <Camera size={13} color="white" />
              <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{user?.firstName} {user?.lastName}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Mail size={14} />{user?.email}
              </div>
              <span className={`badge ${ROLE_COLORS[user?.role]}`}>{user?.role}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.375rem' }}>
              <Calendar size={13} />Tenant: {user?.tenantName || 'N/A'} · Plan: {user?.tenantPlan || 'free'}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Edit Profile</h3>
        <form onSubmit={handleProfile(onProfileSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input {...regProfile('firstName', { required: true })} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input {...regProfile('lastName', { required: true })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Change Password</h3>
        <form onSubmit={handlePw(onPasswordSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '400px' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" {...regPw('currentPassword', { required: true })} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" {...regPw('newPassword', { required: true, minLength: 8 })} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" {...regPw('confirmPassword', { required: true })} />
          </div>
          <Button type="submit" variant="primary" loading={changingPw} style={{ width: 'fit-content' }}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
