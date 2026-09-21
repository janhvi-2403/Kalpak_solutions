import Image from 'next/image';
import Link from 'next/link';

interface KalpakLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  variant?: 'light' | 'dark' | 'transparent';
  showTagline?: boolean;
}

export function KalpakLogo({
  className = '',
  size = 'md',
  href = '/',
  variant = 'transparent',
  showTagline = true,
}: KalpakLogoProps) {
  // Logo emblem is enlarged & highlighted, font size of name is reduced, tagline guaranteed single line
  const configMap = {
    sm: {
      imgWidth: 44,
      imgHeight: 52,
      imgResponsiveClass: 'w-[38px] h-[45px] sm:w-[44px] sm:h-[52px]',
      titleClass: 'text-xs sm:text-sm font-bold tracking-tight',
      taglineClass: 'text-[7.5px] sm:text-[8.5px] font-bold tracking-[0.12em]',
      gapClass: 'gap-2 sm:gap-2.5',
    },
    md: {
      imgWidth: 70,
      imgHeight: 83,
      imgResponsiveClass: 'w-[40px] h-[47px] sm:w-[68px] sm:h-[80px]',
      titleClass: 'text-xs sm:text-base md:text-lg font-extrabold tracking-tight',
      taglineClass: 'text-[8px] sm:text-[9.5px] md:text-[10px] font-bold tracking-[0.14em]',
      gapClass: 'gap-1.5 sm:gap-3',
    },
    lg: {
      imgWidth: 88,
      imgHeight: 104,
      imgResponsiveClass: 'w-[60px] h-[71px] sm:w-[88px] sm:h-[104px]',
      titleClass: 'text-base sm:text-xl md:text-2xl font-extrabold tracking-tight',
      taglineClass: 'text-[9.5px] sm:text-[11px] md:text-[12px] font-bold tracking-[0.16em]',
      gapClass: 'gap-2 sm:gap-3.5',
    },
    xl: {
      imgWidth: 110,
      imgHeight: 130,
      imgResponsiveClass: 'w-[75px] h-[88px] sm:w-[110px] sm:h-[130px]',
      titleClass: 'text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight',
      taglineClass: 'text-[11px] sm:text-[12px] md:text-[14px] font-bold tracking-[0.18em]',
      gapClass: 'gap-2.5 sm:gap-4',
    },
  };

  const config = configMap[size];

  // Dynamic colors based on dark/light background
  const isDark = variant === 'dark';
  const titleColor = isDark ? 'text-white' : 'text-slate-900';
  const taglineColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const logoContent = (
    <div className={`inline-flex items-center select-none whitespace-nowrap shrink-0 ${config.gapClass} ${className}`}>
      {/* Highlighted Crisp Emblem Icon */}
      <div className="relative shrink-0 flex items-center justify-center filter drop-shadow-md">
        <Image
          src="/kalpak-logo-new.png"
          alt="Kalpak Solutions Logo"
          width={config.imgWidth}
          height={config.imgHeight}
          priority
          unoptimized
          className={`object-contain transition-transform duration-200 group-hover:scale-105 ${config.imgResponsiveClass}`}
        />
      </div>

      {/* Crisp Vector Typography: Balanced Name Font & Guaranteed Single-Line Tagline */}
      <div className="flex flex-col justify-center leading-tight text-left whitespace-nowrap min-w-0">
        <span className={`${config.titleClass} ${titleColor} whitespace-nowrap leading-tight`}>
          Kalpak Solutions
        </span>
        {showTagline && (
          <span className={`${config.taglineClass} ${taglineColor} mt-0.5 uppercase whitespace-nowrap tracking-wider hidden sm:block`}>
            WE DEVELOP WEB PRESENCE
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none group whitespace-nowrap shrink-0">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
