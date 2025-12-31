import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  variant = 'default',
  size = 'md',
  error = false,
  success = false,
  fullWidth = true,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = 'rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Variant styles
  const variantStyles = {
    default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
    filled: 'border-transparent bg-gray-100 focus:bg-white focus:border-primary-500 focus:ring-primary-500',
    outline: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
  };
  
  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };
  
  // State styles
  const stateStyles = error 
    ? 'border-error-500 focus:border-error-500 focus:ring-error-500' 
    : success 
    ? 'border-success-500 focus:border-success-500 focus:ring-success-500' 
    : '';
  
  // Width
  const widthClass = fullWidth ? 'w-full' : '';
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${stateStyles} ${widthClass} ${className}`;
  
  return (
    <textarea
      className={combinedClassName}
      {...props}
    />
  );
};