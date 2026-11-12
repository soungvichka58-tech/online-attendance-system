import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const { user, login, registerTeacher } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [expectedStudents, setExpectedStudents] = useState(40);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegistering) {
        if (name.trim().length < 2) {
          toast.error('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          toast.error('Password must be at least 8 characters.');
          setSubmitting(false);
          return;
        }
        if (!acceptTerms) {
          toast.error('Please accept the terms of use and privacy policy.');
          setSubmitting(false);
          return;
        }
        await registerTeacher(name.trim(), email.trim(), password, Number(expectedStudents) || 40);
        toast.success('Teacher account created! Welcome.');
      } else {
        await login(email.trim(), password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err) {
      const code = err.code || '';
      if (code === 'invalid_credentials') {
        toast.error('Invalid email or password.');
      } else if (code === 'email_taken') {
        toast.error('This email is already registered. Please sign in.');
      } else if (code === 'account_suspended') {
        toast.error('This account is suspended.');
      } else if (code === 'rate_limited') {
        toast.error('Too many attempts. Please wait a few minutes and try again.');
      } else {
        toast.error(err.message || 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AttendFlow</h1>
              <p className="text-xs text-slate-500">Online Attendance Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {isRegistering ? 'Create Teacher Account' : 'Teacher Sign In'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {isRegistering
              ? 'Set up your instructor workspace to manage sessions.'
              : 'Sign in to create attendance links and monitor records.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Sarah Jenkins"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Default Class Size (Total Students)
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      required
                      value={expectedStudents}
                      onChange={(e) => setExpectedStudents(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            {isRegistering && (
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I accept the{' '}
                  <a href="https://career.xmus.me/en/terms" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600">terms of use</a>{' '}
                  and{' '}
                  <a href="https://career.xmus.me/en/privacy" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600">privacy policy</a>.
                  Your account also works on the career website.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition"
            >
              <span>
                {submitting
                  ? 'Please wait...'
                  : isRegistering
                  ? 'Create Workspace'
                  : 'Sign In to Dashboard'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : 'Need a teacher account? Register here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;