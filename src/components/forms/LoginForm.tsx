'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (err: any) {
      if (err.statusCode === 400) {
        setError('Email hoặc mật khẩu không đúng');
      } else if (err.statusCode === 403) {
        setError('Tài khoản tạm thời bị khóa. Vui lòng thử lại sau');
      } else {
        setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={Mail}
        required
        disabled={loading}
      />

      <Input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={Lock}
        required
        disabled={loading}
      />

      <div className="text-right">
        <button
          type="button"
          className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline"
        >
          Quên mật khẩu?
        </button>
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        <span>Đăng nhập</span>
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.form>
  );
}