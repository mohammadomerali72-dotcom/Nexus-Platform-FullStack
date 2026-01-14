import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CircleDollarSign, Building2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserRole } from '../../types';
import api from '../../services/api'; // This is the bridge to your Port 5000 backend

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('entrepreneur');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 1. FRONTEND VALIDATION
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 2. PREPARE DATA: Convert lowercase UI role to Capitalized Database role
      const signupData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role === 'entrepreneur' ? 'Entrepreneur' : 'Investor'
      };

      // 3. API CALL: Send data to Node.js -> XAMPP MySQL
      const response = await api.post('/auth/register', signupData);
      
      if (response.status === 201 || response.data.status === "success") {
          alert("Registration Successful! Your account has been saved to the database.");
          navigate('/login'); 
      }
    } catch (err: any) {
      // 4. ERROR HANDLING: Capture specific messages from the backend
      const backendMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg;
      setError(backendMessage || "Connection failed. Please ensure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
            <Building2 size={32} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Join the Nexus network of Investors & Entrepreneurs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {/* BACKEND ERROR DISPLAY */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-sm flex items-start animate-pulse">
              <AlertCircle size={18} className="mr-2 mt-0.5" />
              <span className="font-semibold text-sm">{error}</span>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                I am registering as an:
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
              label="Full name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              startAdornment={<User size={18} className="text-gray-400" />}
            />
            
            <Input
              label="Email address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              startAdornment={<Mail size={18} className="text-gray-400" />}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              startAdornment={<Lock size={18} className="text-gray-400" />}
            />
            
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              startAdornment={<Lock size={18} className="text-gray-400" />}
            />
            
            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-blue-200 transition-all"
            >
              {isLoading ? 'Creating Account...' : 'Create account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};