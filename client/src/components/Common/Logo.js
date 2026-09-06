import React from 'react';

const Logo = ({ variant = 'full', theme = 'light', size = 'default', className = '' }) => {
  const sizeClasses = {
    login: 'h-[140px] w-[140px]',
    navbar: 'h-[48px] w-[48px]',
    sidebar: 'h-[44px] w-[44px]',
    header: 'h-[56px] w-[56px]',
    default: 'h-[44px] w-[44px]'
  };

  const textClasses = {
    login: 'text-4xl',
    navbar: 'text-xl',
    sidebar: 'text-xl',
    header: 'text-2xl',
    default: 'text-xl'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.default;
  const currentTextClass = textClasses[size] || textClasses.default;
  
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`flex items-center gap-3 animate-fade-in ${className}`}>
      <div className={`flex items-center justify-center shrink-0 ${isDark ? 'bg-white rounded-2xl p-2 shadow-lg' : ''}`}>
        <img 
          src="/logo.png" 
          alt="CloudVault Icon" 
          className={`${currentSizeClass} object-contain drop-shadow-sm`}
        />
      </div>
      
      {variant === 'full' && (
        <span 
          className={`font-semibold tracking-tight whitespace-nowrap ${textColor} ${currentTextClass}`} 
          style={{ fontFamily: "'Inter', 'SF Pro Display', sans-serif" }}
        >
          CloudVault
        </span>
      )}
    </div>
  );
};

export default Logo;
