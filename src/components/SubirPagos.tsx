import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface SubirPagosProps {
  alumnoId: number;
  onBack: () => void;
}

export default function SubirPagos({ alumnoId, onBack }: SubirPagosProps) {
  const { colors } = useTheme();
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPago, setSelectedPago] = useState<any>(null);
  const [referencia, setReferencia] = useState('');

  const obtenerPagos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pagos`);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.data || [];
      const misPagos = lista.filter((p: any) => p.alumno_id === alumnoId);
      setPagos(misPagos);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron recuperar las órdenes de pago.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerPagos();
  }, [alumnoId]);

  const handleRegistrarPago = async () => {
    if (!referencia.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la referencia bancaria.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pagos/${selectedPago.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estatus: 'Pagado',
          referencia_bancaria: referencia.trim(),
          fecha_pago: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Comprobante y referencia registrados correctamente.');
        setSelectedPago(null);
        setReferencia('');
        obtenerPagos();
      } else {
        throw new Error();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'Pagado': return { bg: colors.primaryLight, text: colors.primary, border: colors.primary };
      case 'Pendiente': return { bg: colors.accentLight, text: colors.accent, border: colors.accent };
      case 'Condonado': return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
      default: return { bg: colors.wineLight, text: colors.wine, border: colors.wine };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.btnBack, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Volver al Horario</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Control de Pagos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && !selectedPago ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : selectedPago ? (
          <View style={[styles.formCard, { borderColor: colors.primary }]}>
            <Text style={[styles.formTitle, { color: colors.primary }]}>Registrar Comprobante</Text>
            <Text style={styles.formSubtitle}>{selectedPago.concepto}</Text>
            <Text style={[styles.formMonto, { color: colors.accent }]}>Monto requerido: ${selectedPago.monto}</Text>

            <TextInput
              style={styles.input}
              placeholder="Número de Referencia / Folio Bancario"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={referencia}
              onChangeText={setReferencia}
            />

            <TouchableOpacity style={[styles.btnSubmit, { backgroundColor: colors.primary }]} onPress={handleRegistrarPago} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Referencia</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setSelectedPago(null)}>
              <Text style={[styles.cancelText, { color: colors.wine }]}>Cancelar Operación</Text>
            </TouchableOpacity>
          </View>
        ) : pagos.length === 0 ? (
          <Text style={styles.emptyText}>No cuentas con órdenes de pago registradas.</Text>
        ) : (
          pagos.map((pago) => {
            const colores = getEstatusColor(pago.estatus);
            return (
              <View key={pago.id} style={[styles.pagoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={[styles.concepto, { color: colors.textPrimary }]}>{pago.concepto}</Text>
                  <View style={[styles.badge, { backgroundColor: colores.bg, borderColor: colores.border }]}>
                    <Text style={[styles.badgeText, { color: colores.text }]}>{pago.estatus}</Text>
                  </View>
                </View>

                <Text style={[styles.monto, { color: colors.primary }]}>Importe: ${pago.monto}</Text>
                {pago.referencia_bancaria && (
                  <Text style={[styles.referencia, { color: colors.wine }]}>Folio: {pago.referencia_bancaria}</Text>
                )}

                {pago.estatus === 'Pendiente' && (
                  <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.accent }]} onPress={() => setSelectedPago(pago)}>
                    <Text style={styles.btnActionText}>Subir Comprobante / Referencia</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
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
    borderBottomWidth: 1, 
    backgroundColor: '#fff' 
  },
  btnBack: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  backBtnText: { fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600' },
  pagoCard: { 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  concepto: { fontSize: 16, fontWeight: '800', flex: 1 },
  monto: { fontSize: 14, marginTop: 4, fontWeight: '800' },
  referencia: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  btnAction: { 
    marginTop: 12, 
    paddingVertical: 10, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  btnActionText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  formCard: { 
    backgroundColor: '#fff', 
    padding: 22, 
    borderRadius: 20, 
    borderWidth: 2, 
  },
  formTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  formSubtitle: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  formMonto: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  input: { 
    height: 50, 
    borderColor: '#cbd5e1', 
    borderWidth: 1.5, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    marginBottom: 16, 
    color: '#000', 
    backgroundColor: '#f8fafc',
    fontWeight: '600'
  },
  btnSubmit: { 
    height: 50, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, fontWeight: '700' }
});