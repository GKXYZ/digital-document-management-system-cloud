import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, ChevronLeft, User, Folder } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Common/Logo';

const Auth = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isNewUser, setIsNewUser] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const otpInputRefs = useRef([]);

  // Timer for OTP countdown
  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle Google OAuth callback token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error('Google Authentication failed');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token) {
      localStorage.setItem('cloudvault_token', token);
      window.location.href = '/dashboard';
    }
  }, [navigate]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) return toast.error('Please enter your email address');

    setLoading(true);
    try {
      const res = await authAPI.sendOTP({ email });
      if (res.data.success) {
        setIsNewUser(!res.data.userExists);
        setStep(2);
        setCountdown(60);
        toast.success('Verification code sent');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== '' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all filled
    if (value !== '' && index === 5 && newOtp.every(val => val !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => isNaN(char))) return;

    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus appropriate input or submit
    if (pastedData.length === 6) {
      otpInputRefs.current[5]?.focus();
      handleVerifyOtp(newOtp.join(''));
    } else {
      otpInputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleVerifyOtp = async (otpString) => {
    const code = otpString || otp.join('');
    if (code.length !== 6) return toast.error('Please enter a complete 6-digit code');

    setLoading(true);
    try {
      const verifyRes = await authAPI.verifyOTP({ email, otp: code });

      if (verifyRes.data.success) {
        if (isNewUser) {
          setStep(3);
        } else {
          const loginRes = await authAPI.passwordlessLogin({ email });
          if (loginRes.data.success) {
            localStorage.setItem('cloudvault_token', loginRes.data.token);
            localStorage.setItem('cloudvault_user', JSON.stringify(loginRes.data.user));
            window.location.href = '/dashboard';
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your full name');

    setLoading(true);
    try {
      const res = await authAPI.register({ name, email });
      if (res.data.success) {
        const loginRes = await authAPI.passwordlessLogin({ email });
        if (loginRes.data.success) {
          localStorage.setItem('cloudvault_token', loginRes.data.token);
          localStorage.setItem('cloudvault_user', JSON.stringify(loginRes.data.user));
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">

      {/* Left side: Branding / Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-700 flex-col justify-between p-12 relative overflow-hidden text-white">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-400 opacity-20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="mb-16">
            <Logo variant="full" theme="dark" size="login" />
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 max-w-lg">
            Secure workspace for all your important files
          </h1>
          <p className="text-blue-600-100 text-lg max-w-md leading-relaxed">
            Store, organize, and access your documents from anywhere with enterprise-grade security and a beautiful interface.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-blue-600-200">
          <span>&copy; {new Date().getFullYear()} CloudVault</span>
          <span className="w-1 h-1 rounded-full bg-blue-600-300"></span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <span className="w-1 h-1 rounded-full bg-blue-600-300"></span>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px]">

          <div className="lg:hidden mb-10">
            <Logo variant="full" theme="light" size="header" />
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: WELCOME SCREEN */}
            {step === 1 && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome back</h2>
                  <p className="text-gray-600">Please enter your details to sign in.</p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 rounded-xl border border-gray-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <FcGoogle className="w-5 h-5" />
                  Continue with Google
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">or sign in with email</span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>

                <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
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
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>Continue <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === 2 && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                  <p className="text-gray-600 text-sm">
                    We've sent a 6-digit verification code to <br />
                    <span className="text-gray-900 font-medium">{email}</span>
                  </p>
                </div>

                <div className="flex justify-between gap-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 bg-white border border-gray-200 rounded-xl text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/50 transition-all shadow-sm"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Verify Code'
                  )}
                </button>

                <div className="flex items-center justify-between mt-4 px-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" /> Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading}
                    className={`${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-700 hover:text-blue-800'} transition-colors font-medium`}
                  >
                    {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: REGISTRATION */}
            {step === 3 && (
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-500 mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h2>
                  <p className="text-gray-600 text-sm">Almost there! Just tell us your name to complete your account setup.</p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-gray-900">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        required
                        autoFocus
                        className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default Auth;
