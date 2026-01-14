import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const success = await login(email, password);

      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#F7F9FC] via-white to-[#E8EFF7]">
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(31, 58, 95) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Login Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#1F3A5F] to-[#3A6EA5] shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-[#1F3A5F] mb-2">
            Dental Practice Management
          </h1>
          <p className="text-[#475569] font-medium">Sign in to your account</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-[#E2E8F0]">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-semibold">{error}</p>
              </div>
            )}

            {/* Email Field
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-[#1F3A5F]">
                Username or Email Address
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
                  placeholder="Enter your email or Username"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium"
                />
              </div>
            </div> */}
            
            {/* Username or Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="block text-sm font-semibold text-[#1F3A5F]"
              >
                Username or Email Address
              </label>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-400" strokeWidth={2} />
                </div>

                <input
                  id="identifier"
                  type="text"                    // ✅ allows username OR email
                  value={email}                  // you can rename this to `identifier`
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter username or email"
                  autoComplete="username"        // ✅ browser-friendly
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium"
                />
              </div>
            </div>




            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-[#1F3A5F]">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1F3A5F] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-[#E2E8F0] bg-white text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5] cursor-pointer"
                />
                <span className="text-sm font-medium text-[#475569] group-hover:text-[#1F3A5F] transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-semibold text-[#3A6EA5] hover:text-[#1F3A5F] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg hover:from-[#2d5684] hover:to-[#4A7EB5] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" strokeWidth={2.5} />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t-2 border-[#E2E8F0] text-center">
            <p className="text-[#475569] font-medium">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-[#3A6EA5] font-bold hover:text-[#1F3A5F] transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {/* Developer Testing Hint */}
        <div className="mt-6 p-4 bg-[#E8EFF7] border-2 border-[#3A6EA5]/30 rounded-lg">
          <p className="text-xs text-[#1F3A5F] font-semibold mb-2">👨‍💻 Testing Roles:</p>
          <p className="text-xs text-[#1F3A5F]/80">
            Use email:{' '}
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0]">
              owner@test.com
            </code>{' '}
            (Owner),
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0] ml-1">
              admin@test.com
            </code>{' '}
            (Admin),
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0] ml-1">
              manager@test.com
            </code>{' '}
            (Manager),
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0] ml-1">
              doctor@test.com
            </code>{' '}
            (Doctor), or{' '}
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0] ml-1">
              staff@test.com
            </code>{' '}
            (Staff)
          </p>
          <p className="text-xs text-[#2FB9A7] font-semibold mt-2">
            💡 Use <strong>owner@test.com</strong> to access Organization Management
          </p>
        </div>

        {/* Footer Text */}
        <div className="mt-8 text-center">
          <p className="text-[#64748B] text-sm font-medium">
            © 2024 Dental PMS. Secure & HIPAA Compliant.
          </p>
        </div>
      </div>
    </div>
  );
}

    