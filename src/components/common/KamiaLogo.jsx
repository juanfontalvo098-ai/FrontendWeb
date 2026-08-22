// src/components/common/KamiaLogo.jsx
import React from 'react';
import { useUiStore } from '../../store/uiStore';

/**
 * KAMIA by JF — Logotipo e Identidad Visual Oficial
 * 
 * Slogan: "TODO TU NEGOCIO, CONECTADO."
 * Paleta Oficial:
 * - KAMIA Midnight: #111827
 * - KAMIA Indigo:   #6366F1
 * - KAMIA Electric: #8B5CF6
 * - Cloud:          #F8FAFC
 * - White:          #FFFFFF
 */

export const KamiaIcon = ({ size = 36, className = '', style = {} }) => {
  return (
    <img
      src="/assets/branding/kamia-icon.png"
      alt="KAMIA by JF"
      width={size}
      height={size}
      className={`kamia-icon-img ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        borderRadius: '8px',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    />
  );
};

/**
 * Cápsula / Píldora Luminosa del Eslogan (Handcrafted Vector Component)
 */
export const KamiaSloganPill = ({ theme: explicitTheme, style = {} }) => {
  const storeTheme = useUiStore(state => state.theme);
  const activeTheme = explicitTheme || storeTheme || 'dark';
  const isDark = activeTheme === 'dark';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        padding: '6px 16px',
        borderRadius: '999px',
        background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(238, 242, 255, 0.95)',
        border: isDark ? '1px solid rgba(139, 92, 246, 0.45)' : '1px solid rgba(99, 102, 241, 0.35)',
        boxShadow: isDark
          ? '0 0 16px rgba(139, 92, 246, 0.25), inset 0 0 12px rgba(99, 102, 241, 0.1)'
          : '0 2px 10px rgba(99, 102, 241, 0.12), inset 0 0 8px rgba(99, 102, 241, 0.05)',
        userSelect: 'none',
        transition: 'all 0.25s ease',
        ...style
      }}
    >
      {/* Icono Vectorial de Nodos Interconectados */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <circle cx="5" cy="6" r="3" stroke={isDark ? "#8B5CF6" : "#6366F1"} strokeWidth="2" />
        <circle cx="19" cy="6" r="3" stroke={isDark ? "#6366F1" : "#4F46E5"} strokeWidth="2" />
        <circle cx="19" cy="18" r="3" stroke={isDark ? "#8B5CF6" : "#6366F1"} strokeWidth="2" />
        <circle cx="5" cy="18" r="3" stroke={isDark ? "#6366F1" : "#4F46E5"} strokeWidth="2" />
        <path d="M7.5 7.5L16.5 16.5M7.5 16.5L16.5 7.5" stroke={isDark ? "#C4B5FD" : "#4F46E5"} strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <span
        style={{
          fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: isDark ? '#C4B5FD' : '#4338CA',
          textTransform: 'uppercase',
          lineHeight: 1
        }}
      >
        Todo tu negocio, conectado.
      </span>
    </div>
  );
};

export const KamiaLogo = ({
  variant = 'sidebar', // 'sidebar' | 'horizontal' | 'stacked' | 'icon' | 'full'
  theme: explicitTheme,     // 'dark' | 'light'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  showSlogan = false,
  className = '',
  style = {}
}) => {
  const storeTheme = useUiStore(state => state.theme);
  const activeTheme = explicitTheme || storeTheme || 'dark';
  const isDark = activeTheme === 'dark';

  const heightMap = {
    sm: { logoHeight: 26 },
    md: { logoHeight: 34 },
    lg: { logoHeight: 46 },
    xl: { logoHeight: 58 },
  };

  const currentDim = heightMap[size] || heightMap.md;

  // Solo Isotipo
  if (variant === 'icon') {
    return <KamiaIcon size={currentDim.logoHeight} style={style} />;
  }

  // Versión Stacked (Vertical para Login)
  if (variant === 'stacked') {
    const stackedHeight = size === 'xl' ? 120 : size === 'lg' ? 95 : size === 'md' ? 75 : 55;
    const stackedSrc = isDark
      ? '/assets/branding/kamia-logo-stacked-dark.png'
      : '/assets/branding/kamia-logo-stacked-light.png';

    return (
      <div
        className={`kamia-brand-stacked ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          ...style
        }}
      >
        <img
          src={stackedSrc}
          alt="KAMIA by JF"
          style={{
            height: `${stackedHeight}px`,
            maxWidth: '100%',
            objectFit: 'contain',
            userSelect: 'none'
          }}
        />

        {showSlogan && (
          <KamiaSloganPill theme={activeTheme} />
        )}
      </div>
    );
  }

  // Versión Horizontal (Sidebar y Header)
  const logoSrc = isDark
    ? '/assets/branding/kamia-logo-sidebar.png'
    : '/assets/branding/kamia-logo-main.png';

  return (
    <div
      className={`kamia-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '6px',
        ...style
      }}
    >
      <img
        src={logoSrc}
        alt="KAMIA by JF"
        style={{
          height: `${currentDim.logoHeight}px`,
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none'
        }}
      />

      {showSlogan && (
        <KamiaSloganPill theme={activeTheme} />
      )}
    </div>
  );
};

export default KamiaLogo;
