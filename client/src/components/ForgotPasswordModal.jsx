import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * 3-step Forgot Password modal:
 *  Step 1 → Enter email → sends OTP
 *  Step 2 → Enter OTP
 *  Step 3 → Enter new password → done
 */
const ForgotPasswordModal = ({ onClose }) => {
  const { axios } = useContext(AuthContext);

  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Step 1 — send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/send-reset-otp', { email });
      if (data.success) {
        toast.success('OTP sent! Check your email');
        setStep(2);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to send OTP');
    }
    setLoading(false);
  };

  // Step 2 — verify OTP (just move to step 3 — actual verification happens on reset)
  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setStep(3);
  };

  // Step 3 — reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
      if (data.success) {
        toast.success('Password reset! You can now login.');
        onClose();
      } else {
        toast.error(data.message);
        // If OTP expired, go back to step 1
        if (data.message.toLowerCase().includes('expired')) setStep(1);
        // If wrong OTP, go back to step 2
        if (data.message.toLowerCase().includes('invalid otp')) setStep(2);
      }
    } catch {
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  const stepLabel = ['Enter Email', 'Verify OTP', 'New Password'];

  return (
    <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'>
      <div className='bg-[#1a1a2e] border border-gray-600 rounded-2xl w-full max-w-sm shadow-2xl'>

        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-700'>
          <div>
            <h2 className='text-white text-lg font-semibold'>Forgot Password</h2>
            <p className='text-gray-400 text-xs mt-0.5'>Step {step} of 3 — {stepLabel[step - 1]}</p>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-white text-2xl leading-none'>×</button>
        </div>

        {/* Step indicator */}
        <div className='flex gap-1.5 px-5 pt-4'>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              s <= step ? 'bg-violet-500' : 'bg-gray-700'
            }`} />
          ))}
        </div>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className='p-5 flex flex-col gap-4'>
            <p className='text-gray-300 text-sm'>Enter the email address you used to create your account. We'll send a 6-digit OTP.</p>
            <div className='flex flex-col gap-1'>
              <label className='text-gray-400 text-xs'>Email Address</label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='you@example.com'
                required
                className='bg-white/10 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500 transition-colors'
              />
            </div>
            <button
              type='submit'
              disabled={loading}
              className='py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50'
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className='p-5 flex flex-col gap-4'>
            <p className='text-gray-300 text-sm'>
              A 6-digit OTP was sent to <span className='text-violet-400 font-medium'>{email}</span>. Check your inbox (and spam folder).
            </p>
            <div className='flex flex-col gap-1'>
              <label className='text-gray-400 text-xs'>Enter OTP</label>
              <input
                type='text'
                inputMode='numeric'
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder='123456'
                required
                className='bg-white/10 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500 transition-colors tracking-widest text-center text-xl font-bold'
              />
            </div>
            <button
              type='submit'
              className='py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors'
            >
              Verify OTP
            </button>
            <button
              type='button'
              onClick={() => setStep(1)}
              className='text-gray-400 hover:text-white text-xs text-center transition-colors'
            >
              ← Resend OTP (go back)
            </button>
          </form>
        )}

        {/* ── Step 3: New Password ── */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className='p-5 flex flex-col gap-4'>
            <p className='text-gray-300 text-sm'>Choose a new password for your account.</p>
            <div className='flex flex-col gap-1'>
              <label className='text-gray-400 text-xs'>New Password</label>
              <div className='relative'>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='Min. 6 characters'
                  required
                  className='w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-white text-sm outline-none focus:border-violet-500 transition-colors'
                />
                <button
                  type='button'
                  onClick={() => setShowPass(!showPass)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs'
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-gray-400 text-xs'>Confirm Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Re-enter password'
                required
                className='bg-white/10 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500 transition-colors'
              />
            </div>
            {/* Password match indicator */}
            {confirmPassword && (
              <p className={`text-xs ${newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
            <button
              type='submit'
              disabled={loading}
              className='py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50'
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
