import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, CircleDollarSign, Building2, LogIn, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserRole } from '../../types';
import api from '../../services/api'; // Ensure this points to your api.ts bridge

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('entrepreneur'); 
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // 1. FORCE CLEAR: This stops the "Throttling Navigation" infinite loop
      localStorage.clear();

      // 2. CALL BACKEND: Connects to your Node.js/XAMPP server
      const response = await api.post('/auth/login', { 
        email, 
        password 
      });
      
      const { token, user, message } = response.data;

      if (token && user) {
        // 3. SAVE SESSION DATA: Using multiple keys to satisfy the template's Auth Guard
        const userString = JSON.stringify(user);
        
        // Standard Keys
        localStorage.setItem('token', token);
        localStorage.setItem('user', userString);
        localStorage.setItem('role', user.role);

        // Template Specific Keys (Found in the cloned repo's AuthContext)
        localStorage.setItem('business_nexus_token', token);
        localStorage.setItem('business_nexus_user', userString);
        localStorage.setItem('business_nexus_role', user.role);

        // 4. Milestone 7: Show simulated 2FA alert
        alert(message);

        // 5. HARD REDIRECTION:
        // We use window.location.href instead of navigate to force the browser 
        // to recognize the new session and stop the infinite loop.
        const rolePath = user.role.toLowerCase(); 
        window.location.href = `/dashboard/${rolePath}`;
      }
    } catch (err: any) {
      // 6. Handle Backend Security Errors
      const msg = err.response?.data?.message || "Login failed. Ensure backend is running.";
      setError(msg);
      setIsLoading(false);
    }
  };
  
  const fillDemoCredentials = (userRole: UserRole) => {
    // Fill with the account you successfully registered in XAMPP
    setEmail('mohammadomerali72@gmail.com');
    setPassword('password123'); 
    setRole(userRole);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <LogIn size={32} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Sign in to Business Nexus
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Professional Full-Stack Collaboration Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded flex items-start animate-pulse">
              <AlertCircle size={18} className="mr-2 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Sign in as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`py-2.5 px-4 border rounded-lg flex items-center justify-center transition-all ${
                    role === 'entrepreneur'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500 font-bold'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setRole('entrepreneur')}
                >
                  <Building2 size={18} className="mr-2" />
                  Entrepreneur
                </button>
                <button
                  type="button"
                  className={`py-2.5 px-4 border rounded-lg flex items-center justify-center transition-all ${
                    role === 'investor'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500 font-bold'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setRole('investor')}
                >
                  <CircleDollarSign size={18} className="mr-2" />
                  Investor
                </button>
              </div>
            </div>
            
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              startAdornment={<User size={18} className="text-gray-400" />}
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              startAdornment={<Lock size={18} className="text-gray-400" />}
            />
            
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
            >
              Sign in to Dashboard
            </Button>
          </form>
          
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Demo Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" onClick={() => fillDemoCredentials('entrepreneur')}>
                Ent. Demo
              </Button>
              <Button variant="outline" size="sm" onClick={() => fillDemoCredentials('investor')}>
                Inv. Demo
              </Button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to Nexus?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};