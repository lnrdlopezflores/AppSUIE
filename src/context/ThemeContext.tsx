import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  wine: string;
  wineLight: string;
  bg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  tagText: string;
}

// Paleta Institucional CECyTE EMSAD
export const PALETA_INSTITUCIONAL: ThemeColors = {
  primary: '#0F7F41',       // Verde Bandera
  primaryLight: '#E7F3EC',
  accent: '#E66711',        // Naranja Institucional
  accentLight: '#FDEEE4',
  wine: '#841B44',          // Guinda / Vino
  wineLight: '#F5E8ED',
  bg: '#f8fafc',
  cardBg: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  tagText: '#ffffff',
};

// Paleta Neutral Oficial (Veda Electoral / Revocación de Mandato)
export const PALETA_VEDA_ELECTORAL: ThemeColors = {
  primary: '#334155',       // Slate / Pizarra Neutral
  primaryLight: '#f1f5f9',
  accent: '#475569',        // Gris Medio
  accentLight: '#e2e8f0',
  wine: '#64748b',          // Gris Frío
  wineLight: '#f8fafc',
  bg: '#f4f6f8',
  cardBg: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#cbd5e1',
  tagText: '#ffffff',
};

interface ThemeContextType {
  colors: ThemeColors;
  isVedaElectoral: boolean;
  toggleVedaElectoral: (activar: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: PALETA_INSTITUCIONAL,
  isVedaElectoral: false,
  toggleVedaElectoral: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVedaElectoral, setIsVedaElectoral] = useState(false);

  useEffect(() => {
    const cargarPreferencia = async () => {
      try {
        let guardado: string | null = null;
        if (Platform.OS === 'web') {
          guardado = localStorage.getItem('suie_veda_electoral');
        } else {
          guardado = await SecureStore.getItemAsync('suie_veda_electoral');
        }
        if (guardado !== null) {
          setIsVedaElectoral(JSON.parse(guardado));
        }
      } catch (e) {
        console.error('Error cargando tema:', e);
      }
    };
    cargarPreferencia();
  }, []);

  const toggleVedaElectoral = async (activar: boolean) => {
    setIsVedaElectoral(activar);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('suie_veda_electoral', JSON.stringify(activar));
      } else {
        await SecureStore.setItemAsync('suie_veda_electoral', JSON.stringify(activar));
      }
    } catch (e) {
      console.error('Error guardando preferencia de tema:', e);
    }
  };

  const colors = isVedaElectoral ? PALETA_VEDA_ELECTORAL : PALETA_INSTITUCIONAL;

  return (
    <ThemeContext.Provider value={{ colors, isVedaElectoral, toggleVedaElectoral }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);