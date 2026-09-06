import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Lock, Eye, EyeOff, Check, Folder } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '../components/Common/Logo';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error('Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a special character.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, { password });
      toast.success('Password updated successfully! Please login with your new password.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Left side: Branding */}
      <div className="hidden lg:flex w-1/2 bg-blue-700 flex-col justify-between p-12 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-400 opacity-20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="mb-16">
            <Logo variant="full" theme="dark" size="login" />
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 max-w-lg">
            Secure your account
          </h1>
          <p className="text-blue-600-100 text-lg max-w-md leading-relaxed">
            Create a strong new password to protect your vault and sensitive documents.
          </p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px]">

          <div className="lg:hidden mb-10">
            <Logo variant="full" theme="light" size="header" />
          </div>

          <motion.div variants={pageVariants} initial="initial" animate="animate" className="flex flex-col gap-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Reset Password</h2>
              <p className="text-gray-600">Enter your new password below</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-900">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 special"
                    required
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Update Password <Check className="w-5 h-5" /></>
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
