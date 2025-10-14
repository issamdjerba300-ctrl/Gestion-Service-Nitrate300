import React from 'react';

// Configuration - easily update logo path and caption here
const LOGO_CONFIG = {
  imagePath: '/logo.png', // Update this path to your actual logo file
  caption: 'Groupe Chimique Tunisien',
  altText: 'Project Logo'
};

interface ProjectLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const ProjectLogo: React.FC<ProjectLogoProps> = ({ 
  className = '', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-16 h-auto',
    medium: 'w-20 h-auto',
    large: 'w-48 h-auto'
  };

  const captionSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <img
        src={LOGO_CONFIG.imagePath}
        alt={LOGO_CONFIG.altText}
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // Fallback if image doesn't exist
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <span className={`${captionSizeClasses[size]} text-muted-foreground text-center font-medium leading-tight`}>
        {LOGO_CONFIG.caption}
      </span>
    </div>
  );
};

export default ProjectLogo;
export { LOGO_CONFIG };