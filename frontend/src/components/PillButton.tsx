import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  children: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-8 py-3.5 text-base font-semibold gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#A55FC6] hover:bg-[#7A3A9A] text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
    secondary:
      'bg-[#F5E6F8] hover:bg-[#eddcef] text-[#7A3A9A] border border-[#d0c2d1]/40 hover:border-[#A55FC6]/40',
    danger:
      'bg-[#ba1a1a] hover:bg-[#93000a] text-white shadow-sm hover:opacity-90',
    ghost:
      'bg-transparent hover:bg-[#F5E6F8]/60 text-[#4A2160]',
  };

  return (
    <button
      className={`rounded-full inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
