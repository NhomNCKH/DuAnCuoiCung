'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  // Password validation
  const validatePassword = (pwd: string) => {
    setPasswordValidations({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    validatePassword(pwd);
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const isFormValid = name && email && password && confirmPassword && 
                     password === confirmPassword && isPasswordValid && agreeTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Vui lòng điền đầy đủ thông tin và đồng ý với điều khoản');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register({ name, email, password });
      onSuccess?.();
    } catch (err: any) {
      if (err.statusCode === 409) {
        setError('Email đã được đăng ký. Vui lòng sử dụng email khác');
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
        type="text"
        placeholder="Họ và tên"
        value={name}
        onChange={(e) => setName(e.target.value)}
        icon={User}
        required
        disabled={loading}
      />

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={Mail}
        required
        disabled={loading}
      />

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={handlePasswordChange}
          icon={Lock}
          required
          disabled={loading}
        />
        
        {password && (
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-1 ${passwordValidations.length ? 'text-green-600' : 'text-red-600'}`}>
              {passwordValidations.length ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Ít nhất 8 ký tự
            </div>
            <div className={`flex items-center gap-1 ${passwordValidations.uppercase ? 'text-green-600' : 'text-red-600'}`}>
              {passwordValidations.uppercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Có chữ hoa
            </div>
            <div className={`flex items-center gap-1 ${passwordValidations.lowercase ? 'text-green-600' : 'text-red-600'}`}>
              {passwordValidations.lowercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Có chữ thường
            </div>
            <div className={`flex items-center gap-1 ${passwordValidations.number ? 'text-green-600' : 'text-red-600'}`}>
              {passwordValidations.number ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Có số
            </div>
          </div>
        )}
      </div>

      <Input
        type="password"
        placeholder="Xác nhận mật khẩu"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        icon={Lock}
        required
        disabled={loading}
        error={confirmPassword && password !== confirmPassword ? 'Mật khẩu không khớp' : ''}
      />

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="agreeTerms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          disabled={loading}
        />
        <label htmlFor="agreeTerms" className="text-sm text-gray-600">
          Tôi đồng ý với{' '}
          <button type="button" className="text-emerald-600 hover:underline font-medium">
            Điều khoản sử dụng
          </button>{' '}
          và{' '}
          <button type="button" className="text-emerald-600 hover:underline font-medium">
            Chính sách bảo mật
          </button>
        </label>
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={!isFormValid || loading}
        className="w-full"
      >
        <span>Tạo tài khoản</span>
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.form>
  );
}