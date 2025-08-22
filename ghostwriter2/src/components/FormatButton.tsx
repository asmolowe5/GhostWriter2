import React from 'react';

interface FormatButtonProps {
  icon: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const FormatButton: React.FC<FormatButtonProps> = ({
  icon,
  title,
  isActive,
  onClick,
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`format-button ${isActive ? 'active' : ''} ${className}`}
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
    >
      <span className="format-icon">{icon}</span>
    </button>
  );
};

export default FormatButton;