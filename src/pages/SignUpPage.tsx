import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, Activity, Building2, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    practiceName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    try {
      setLoading(true);

      // Call backend signup API
      await api.post('/api/v1/auth/signup', {
        email: formData.email,
        password: formData.password,
        tenant_id: 1,
      });

      // Auto login after signup
      const success = await login(formData.email, formData.password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Signup successful, but login failed. Please try logging in.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Signup failed. Please try again.';
      setError(typeof msg === 'string' ? msg : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-green-50">
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(203, 213, 225) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Sign Up Card */}
      <div className="relative w-full max-w-3xl z-10 my-8">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Your Account</h1>
          <p className="text-slate-600 font-medium">Start managing your dental practice today</p>
        </div>

        {/* Sign Up Form Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-semibold">{error}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="John"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
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
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john.doe@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                />
              </div>
            </div>

            {/* Phone & Practice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                </div>
              </div>

              {/* Practice */}
              <div className="space-y-2">
                <label htmlFor="practiceName" className="block text-sm font-semibold text-slate-700">
                  Practice Name
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="practiceName"
                    type="text"
                    value={formData.practiceName}
                    onChange={(e) => handleChange('practiceName', e.target.value)}
                    placeholder="Smile Dental Care"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create password"
                    required
                    minLength={8}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={2} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Confirm password"
                    required
                    minLength={8}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={2} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 bg-white text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-slate-700 font-medium leading-relaxed cursor-pointer">
                I agree to the{' '}
                <button type="button" className="text-green-600 font-bold hover:text-green-700 transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-green-600 font-bold hover:text-green-700 transition-colors">
                  Privacy Policy
                </button>
                {', and confirm that my practice will comply with HIPAA regulations.'}
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-base shadow-md hover:shadow-lg hover:from-green-700 hover:to-teal-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-5 h-5" strokeWidth={2.5} />
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t-2 border-slate-200 text-center">
            <p className="text-slate-600 font-medium">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-green-600 font-bold hover:text-green-700 transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm font-medium">
            © 2024 Dental PMS. Secure & HIPAA Compliant.
          </p>
        </div>
      </div>
    </div>
  );
}



// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Mail, Lock, User, Eye, EyeOff, UserPlus, Activity, Building2, Phone } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';

// export default function SignUpPage() {
//   const navigate = useNavigate();
//   const { login } = useAuth();
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     email: '',
//     phone: '',
//     practiceName: '',
//     password: '',
//     confirmPassword: ''
//   });
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [acceptTerms, setAcceptTerms] = useState(false);

//   const handleChange = (field: string, value: string) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (formData.password !== formData.confirmPassword) {
//       alert('Passwords do not match!');
//       return;
//     }
    
//     if (!acceptTerms) {
//       alert('Please accept the terms and conditions');
//       return;
//     }
    
//     login(formData.email, formData.password);
//     navigate('/dashboard');
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-green-50">
//       {/* Subtle Background Pattern */}
//       <div className="absolute inset-0 opacity-40" style={{
//         backgroundImage: `radial-gradient(circle at 1px 1px, rgb(203, 213, 225) 1px, transparent 0)`,
//         backgroundSize: '40px 40px'
//       }}></div>

//       {/* Sign Up Card */}
//       <div className="relative w-full max-w-3xl z-10 my-8">
//         {/* Logo/Brand Section */}
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 shadow-lg mb-4">
//             <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
//           </div>
//           <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Your Account</h1>
//           <p className="text-slate-600 font-medium">Start managing your dental practice today</p>
//         </div>

//         {/* Sign Up Form Card */}
//         <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-slate-200">
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Name Fields - Side by Side */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* First Name */}
//               <div className="space-y-2">
//                 <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700">
//                   First Name
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <User className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="firstName"
//                     type="text"
//                     value={formData.firstName}
//                     onChange={(e) => handleChange('firstName', e.target.value)}
//                     placeholder="John"
//                     required
//                     className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                 </div>
//               </div>

//               {/* Last Name */}
//               <div className="space-y-2">
//                 <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700">
//                   Last Name
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <User className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="lastName"
//                     type="text"
//                     value={formData.lastName}
//                     onChange={(e) => handleChange('lastName', e.target.value)}
//                     placeholder="Doe"
//                     required
//                     className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Email Field */}
//             <div className="space-y-2">
//               <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                   <Mail className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                 </div>
//                 <input
//                   id="email"
//                   type="email"
//                   value={formData.email}
//                   onChange={(e) => handleChange('email', e.target.value)}
//                   placeholder="john.doe@example.com"
//                   required
//                   className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                 />
//               </div>
//             </div>

//             {/* Phone & Practice Name - Side by Side */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Phone */}
//               <div className="space-y-2">
//                 <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
//                   Phone Number
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <Phone className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="phone"
//                     type="tel"
//                     value={formData.phone}
//                     onChange={(e) => handleChange('phone', e.target.value)}
//                     placeholder="(555) 123-4567"
//                     required
//                     className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                 </div>
//               </div>

//               {/* Practice Name */}
//               <div className="space-y-2">
//                 <label htmlFor="practiceName" className="block text-sm font-semibold text-slate-700">
//                   Practice Name
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <Building2 className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="practiceName"
//                     type="text"
//                     value={formData.practiceName}
//                     onChange={(e) => handleChange('practiceName', e.target.value)}
//                     placeholder="Smile Dental Care"
//                     required
//                     className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Password Fields - Side by Side */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Password */}
//               <div className="space-y-2">
//                 <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
//                   Password
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="password"
//                     type={showPassword ? 'text' : 'password'}
//                     value={formData.password}
//                     onChange={(e) => handleChange('password', e.target.value)}
//                     placeholder="Create password"
//                     required
//                     minLength={8}
//                     className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
//                   >
//                     {showPassword ? (
//                       <EyeOff className="w-5 h-5" strokeWidth={2} />
//                     ) : (
//                       <Eye className="w-5 h-5" strokeWidth={2} />
//                     )}
//                   </button>
//                 </div>
//               </div>

//               {/* Confirm Password */}
//               <div className="space-y-2">
//                 <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
//                   Confirm Password
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
//                     <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
//                   </div>
//                   <input
//                     id="confirmPassword"
//                     type={showConfirmPassword ? 'text' : 'password'}
//                     value={formData.confirmPassword}
//                     onChange={(e) => handleChange('confirmPassword', e.target.value)}
//                     placeholder="Confirm password"
//                     required
//                     minLength={8}
//                     className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 transition-all duration-200 font-medium"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                     className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
//                   >
//                     {showConfirmPassword ? (
//                       <EyeOff className="w-5 h-5" strokeWidth={2} />
//                     ) : (
//                       <Eye className="w-5 h-5" strokeWidth={2} />
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Terms & Conditions */}
//             <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
//               <input
//                 type="checkbox"
//                 id="acceptTerms"
//                 checked={acceptTerms}
//                 onChange={(e) => setAcceptTerms(e.target.checked)}
//                 className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 bg-white text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
//               />
//               <label htmlFor="acceptTerms" className="text-sm text-slate-700 font-medium leading-relaxed cursor-pointer">
//                 I agree to the{' '}
//                 <button type="button" className="text-green-600 font-bold hover:text-green-700 transition-colors">
//                   Terms of Service
//                 </button>
//                 {' '}and{' '}
//                 <button type="button" className="text-green-600 font-bold hover:text-green-700 transition-colors">
//                   Privacy Policy
//                 </button>
//                 {', and confirm that my practice will comply with HIPAA regulations.'}
//               </label>
//             </div>

//             {/* Sign Up Button */}
//             <button
//               type="submit"
//               className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-base shadow-md hover:shadow-lg hover:from-green-700 hover:to-teal-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
//             >
//               <UserPlus className="w-5 h-5" strokeWidth={2.5} />
//               Create Account
//             </button>
//           </form>

//           {/* Login Link */}
//           <div className="mt-6 pt-6 border-t-2 border-slate-200 text-center">
//             <p className="text-slate-600 font-medium">
//               Already have an account?{' '}
//               <button
//                 onClick={() => navigate('/login')}
//                 className="text-green-600 font-bold hover:text-green-700 transition-colors"
//               >
//                 Sign in
//               </button>
//             </p>
//           </div>
//         </div>

//         {/* Footer Text */}
//         <div className="mt-8 text-center">
//           <p className="text-slate-500 text-sm font-medium">
//             © 2024 Dental PMS. Secure & HIPAA Compliant.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
