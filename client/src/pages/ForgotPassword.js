import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Mail, ArrowRight, ArrowLeft, Folder } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '../components/Common/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSubmitted(true);
      toast.success('Reset link generated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
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
      {/* Left side: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-700 flex-col justify-between p-12 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-400 opacity-20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="mb-16">
            <Logo variant="full" theme="dark" size="login" />
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 max-w-lg">
            Recover your account access
          </h1>
          <p className="text-blue-600-100 text-lg max-w-md leading-relaxed">
            Don't worry, it happens to the best of us. Let's get you back into your vault securely.
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
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Forgot Password</h2>
              <p className="text-gray-600">Enter your email to receive a reset link</p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-blue-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Check your console!</h3>
                <p className="text-gray-600 text-sm mb-6">
                  For this development environment, the reset link has been printed to the server console.
                </p>
                <Link to="/login" className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm">
                  <ArrowLeft className="w-5 h-5" /> Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-900">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    />
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
                    <>Send Reset Link <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            )}

            {!submitted && (
              <p className="text-center text-sm text-gray-600 mt-4">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-700 hover:text-blue-800 font-medium transition-colors">
                  Sign In
                </Link>
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
