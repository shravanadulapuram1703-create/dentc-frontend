import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Activity, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(203, 213, 225) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Forgot Password Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset Password</h1>
          <p className="text-slate-600 font-medium">
            {isSubmitted 
              ? 'Check your email for reset instructions' 
              : 'Enter your email to receive reset instructions'
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-slate-200">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Information Text */}
              <div className="p-4 rounded-lg bg-cyan-50 border-2 border-cyan-200">
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all duration-200 font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-base shadow-md hover:shadow-lg hover:from-teal-700 hover:to-cyan-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" strokeWidth={2.5} />
                Send Reset Link
              </button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                Back to Login
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900">Check Your Email</h2>
                <p className="text-slate-600 font-medium leading-relaxed">
                  We've sent password reset instructions to{' '}
                  <span className="text-teal-600 font-bold">{email}</span>
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-teal-50 border-2 border-teal-200">
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  If you don't see the email, check your spam folder or try again with a different email address.
                </p>
              </div>

              {/* Back to Login */}
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer Text */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm font-medium">
            © 2024 Dental PMS. Secure & HIPAA Compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
