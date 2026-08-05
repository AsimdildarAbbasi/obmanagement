'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getStoredUser, getDashboardRoute } from './lib/auth';

export default function LoginPage() {
  const router = useRouter();

  const [activeRole, setActiveRole] = useState('Faculty');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleMap = {
    'Faculty': 2,
    'Supervisor': 3,
    'Office Boy': 1,
  };

  const dashboardMap = {
    1: '/officeboy/dashboard',
    2: '/faculty/dashboard',
    3: '/supervisor/dashboard',
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    const redirectPath = storedUser ? getDashboardRoute(storedUser.role) : null;
    if (redirectPath) {
      router.push(redirectPath);
    }
  }, [router]);

  async function handleLogin() {
    setError('');

    if (!name || !password) {
      setError('Please enter your name and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5077/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('Invalid name or password. Please try again.');
        setLoading(false);
        return;
      }

      if (data.role !== roleMap[activeRole]) {
        setError(`This account is not a ${activeRole}. Please select the correct role.`);
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(data));
      router.push(dashboardMap[data.role]);

    } catch (err) {
      setError('Cannot connect to server. Make sure the API is running.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg px-10 py-12"
      >

        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-4"
        >
          <Image src="/logo.jpeg" alt="BIIT Logo" width={80} height={80} />
        </motion.div>

        {/* Title */}
        <h1 className="text-center text-xl font-extrabold text-gray-800 mb-2">
          BIIT Office Boy Management
        </h1>
        <p className="text-center text-base text-gray-600 mb-6">
          Sign in to your account
        </p>

        {/* Role Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
          {['Faculty', 'Supervisor', 'Office Boy'].map((role) => (
            <motion.button
              key={role}
              onClick={() => { setActiveRole(role); setError(''); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor: activeRole === role ? '#0C7347' : '#ffffff',
                color: activeRole === role ? '#ffffff' : '#4B5563'
              }}
              transition={{ duration: 0.3 }}
              className="flex-1 py-3 text-base font-semibold"
            >
              {role}
            </motion.button>
          ))}
        </div>

        {/* Name Field */}
        <motion.div whileFocus={{ scale: 1.02 }} className="mb-4">
          <label className="block text-base font-bold text-gray-700 mb-1">
            Name
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 focus-within:border-[#0C7347]">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 outline-none text-base text-gray-700"
            />
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div whileFocus={{ scale: 1.02 }} className="mb-4">
          <label className="block text-base font-bold text-gray-700 mb-1">
            Password
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 focus-within:border-[#0C7347]">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="flex-1 outline-none text-base text-gray-700"
            />
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Sign In Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-lg text-white text-base font-bold bg-[#0C7347] hover:opacity-90 transition disabled:opacity-70"
        >
          {loading ? 'Signing in...' : '→ Sign In'}
        </motion.button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Barani Institute of Information Technology © 2026
        </p>

      </motion.div>
    </div>
  );
}