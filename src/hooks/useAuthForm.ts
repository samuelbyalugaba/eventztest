import { useState } from 'react';

interface FormData {
  email: string;
  password: string;
  fullName: string;
}

export function useAuthForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', fullName: '' });
  };

  return { formData, setFormData, handleInputChange, resetForm };
}
