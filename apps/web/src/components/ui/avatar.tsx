import * as React from 'react';
import { cn } from '@kalpak/ui';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, size = 'md', className, ...props }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-slate-800 text-white flex items-center justify-center font-medium select-none shadow-sm',
        sizes[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
