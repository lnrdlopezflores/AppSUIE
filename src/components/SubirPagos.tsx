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

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface SubirPagosProps {
  alumnoId: number;
  onBack: () => void;
}

export default function SubirPagos({ alumnoId, onBack }: SubirPagosProps) {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPago, setSelectedPago] = useState<any>(null);
  const [referencia, setReferencia] = useState('');

  // Cargar los pagos del alumno
  const obtenerPagos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pagos`);
      const data = await res.json();
      // Filtrar únicamente los pagos que pertenezcan a este alumno
      const misPagos = data.filter((p: any) => p.alumno_id === alumnoId);
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

  // Enviar la referencia del pago para revisión
  const handleRegistrarPago = async () => {
    if (!referencia.trim()) {
      Alert.alert('Campo Requerido', 'Por favor, ingresa la referencia bancaria.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pagos/${selectedPago.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estatus: 'Pagado', // Se marca como pagado o pendiente de validación según el flujo
          referencia_bancaria: referencia.trim(),
          fecha_pago: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Referencia de pago registrada correctamente.');
        setSelectedPago(null);
        setReferencia('');
        obtenerPagos(); // Recargar la lista
      } else {
        throw new Error();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar el registro del pago.');
    } finally {
      setLoading(false);
    }
  };

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case 'Pagado': return { bg: '#c6f6d5', text: '#22543d' };
      case 'Pendiente': return { bg: '#feebc8', text: '#744210' };
      case 'Condonado': return { bg: '#e2e8f0', text: '#4a5568' };
      default: return { bg: '#fed7d7', text: '#742a2a' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Volver al Horario</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Control de Pagos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && !selectedPago ? (
          <ActivityIndicator size="large" color="#00a6ed" style={{ marginTop: 40 }} />
        ) : selectedPago ? (
          // Formulario para subir la referencia
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Registrar Comprobante</Text>
            <Text style={styles.formSubtitle}>{selectedPago.concepto}</Text>
            <Text style={styles.formMonto}>Monto a pagar: ${selectedPago.monto}</Text>

            <TextInput
              style={styles.input}
              placeholder="Número de Referencia Bancaria"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={referencia}
              onChangeText={setReferencia}
            />

            <TouchableOpacity style={styles.btnSubmit} onPress={handleRegistrarPago} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Referencia</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setSelectedPago(null)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : pagos.length === 0 ? (
          <Text style={styles.emptyText}>No tienes órdenes de pago registradas.</Text>
        ) : (
          // Listado de estados de cuenta
          pagos.map((pago) => {
            const colores = getEstatusColor(pago.estatus);
            return (
              <View key={pago.id} style={styles.pagoCard}>
                <View style={styles.row}>
                  <Text style={styles.concepto}>{pago.concepto}</Text>
                  <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                    <Text style={[styles.badgeText, { color: colores.text }]}>{pago.estatus}</Text>
                  </View>
                </View>

                <Text style={styles.monto}>Monto: ${pago.monto}</Text>
                {pago.referencia_bancaria && (
                  <Text style={styles.referencia}>Ref: {pago.referencia_bancaria}</Text>
                )}

                {pago.estatus === 'Pendiente' && (
                  <TouchableOpacity style={styles.btnAction} onPress={() => setSelectedPago(pago)}>
                    <Text style={styles.btnActionText}>Subir Pago</Text>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#edf2f7', backgroundColor: '#fff' },
  backBtn: { color: '#00a6ed', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a202c' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
  pagoCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#edf2f7', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  concepto: { fontSize: 16, fontWeight: '600', color: '#2d3748', flex: 1 },
  monto: { fontSize: 14, color: '#4a5568', marginTop: 4, fontWeight: '500' },
  referencia: { fontSize: 12, color: '#718096', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  btnAction: { marginTop: 12, backgroundColor: '#cae2e6', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnActionText: { color: '#0070a3', fontWeight: 'bold', fontSize: 13 },
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef' },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a202c', textAlign: 'center' },
  formSubtitle: { fontSize: 15, color: '#4a5568', textAlign: 'center', marginTop: 4 },
  formMonto: { fontSize: 14, color: '#00a6ed', fontWeight: 'bold', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  input: { height: 48, borderColor: '#dee2e6', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, color: '#000', backgroundColor: '#fdfdfd' },
  btnSubmit: { height: 48, backgroundColor: '#00a6ed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#718096', fontSize: 14 }
});