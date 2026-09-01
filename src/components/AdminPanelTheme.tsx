import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AdminPanelProps {
  adminUser: any;
  onBack: () => void;
}

export default function AdminPanelTheme({ adminUser, onBack }: AdminPanelProps) {
  const { colors, isVedaElectoral, toggleVedaElectoral } = useTheme();

  const handleSwitch = (valor: boolean) => {
    toggleVedaElectoral(valor);
    if (valor) {
      Alert.alert(
        'Veda Electoral Activada',
        'El sistema ha pasado al modo neutral. Todos los usuarios visualizarán el mensaje normativo al iniciar sesión.'
      );
    } else {
      Alert.alert(
        'Modo Institucional Restaurado',
        'Se han reactivado los colores oficiales del CECyTE EMSAD.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.btnBack, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.btnBackText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Panel Administrativo</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner Admin */}
        <View style={[styles.adminBanner, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.adminRole, { color: colors.accent }]}>SESIÓN DE CONTROL CENTRAL</Text>
          <Text style={[styles.adminName, { color: colors.textPrimary }]}>
            {adminUser?.nombre || adminUser?.username || 'Administrador'}
          </Text>
          <Text style={[styles.adminSub, { color: colors.textSecondary }]}>
            Gestión institucional y cumplimiento normativo
          </Text>
        </View>

        {/* Sección de Veda Electoral */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.primary }]}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 24 }}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Modo Veda Electoral y Neutralidad
              </Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                Aplica a campañas políticas, elecciones y procesos de revocación de mandato.
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
              {isVedaElectoral ? '🟢 Modo Neutral Activo' : '⚪ Modo Institucional Normal'}
            </Text>
            <Switch
              value={isVedaElectoral}
              onValueChange={handleSwitch}
              trackColor={{ false: '#cbd5e1', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[styles.normativaBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.normativaTitle, { color: colors.primary }]}>
              📜 Ley General en Materia de Delitos Electorales:
            </Text>
            <Text style={[styles.normativaText, { color: colors.textPrimary }]}>
              Al activar este modo, la aplicación sustituye automáticamente los colores institucionales por tonos neutros (pizarra y grises) y notifica a cada usuario la disposición oficial al iniciar sesión.
            </Text>
          </View>
        </View>

        {/* Vista previa de la paleta activa */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Paleta en Funcionamiento</Text>
        <View style={styles.palettePreview}>
          <View style={[styles.colorBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.colorBoxText}>Principal</Text>
          </View>
          <View style={[styles.colorBox, { backgroundColor: colors.accent }]}>
            <Text style={styles.colorBoxText}>Acento</Text>
          </View>
          <View style={[styles.colorBox, { backgroundColor: colors.wine }]}>
            <Text style={styles.colorBoxText}>Secundario</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
  },
  btnBack: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnBackText: { fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  adminBanner: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  adminRole: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  adminName: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  adminSub: { fontSize: 12, marginTop: 2 },
  card: { padding: 18, borderRadius: 18, borderWidth: 2, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: '800' },
  normativaBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  normativaTitle: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  normativaText: { fontSize: 11, lineHeight: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  palettePreview: { flexDirection: 'row', gap: 10 },
  colorBox: { flex: 1, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  colorBoxText: { color: '#ffffff', fontWeight: '800', fontSize: 11 },
});