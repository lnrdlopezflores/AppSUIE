import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

  const obtenerPagos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pagos`);
      const data = await res.json();
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
      case 'Pagado': return { bg: '#E7F3EC', text: '#0F7F41', border: '#0F7F41' };
      case 'Pendiente': return { bg: '#FDEEE4', text: '#E66711', border: '#E66711' };
      case 'Condonado': return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
      default: return { bg: '#F5E8ED', text: '#841B44', border: '#841B44' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.btnBack}>
          <Text style={styles.backBtnText}>← Volver al Horario</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Control de Pagos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && !selectedPago ? (
          <ActivityIndicator size="large" color="#0F7F41" style={{ marginTop: 40 }} />
        ) : selectedPago ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Registrar Comprobante</Text>
            <Text style={styles.formSubtitle}>{selectedPago.concepto}</Text>
            <Text style={styles.formMonto}>Monto requerido: ${selectedPago.monto}</Text>

            <TextInput
              style={styles.input}
              placeholder="Número de Referencia / Folio Bancario"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={referencia}
              onChangeText={setReferencia}
            />

            <TouchableOpacity style={styles.btnSubmit} onPress={handleRegistrarPago} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Referencia</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setSelectedPago(null)}>
              <Text style={styles.cancelText}>Cancelar Operación</Text>
            </TouchableOpacity>
          </View>
        ) : pagos.length === 0 ? (
          <Text style={styles.emptyText}>No cuentas con órdenes de pago registradas.</Text>
        ) : (
          pagos.map((pago) => {
            const colores = getEstatusColor(pago.estatus);
            return (
              <View key={pago.id} style={styles.pagoCard}>
                <View style={styles.row}>
                  <Text style={styles.concepto}>{pago.concepto}</Text>
                  <View style={[styles.badge, { backgroundColor: colores.bg, borderColor: colores.border }]}>
                    <Text style={[styles.badgeText, { color: colores.text }]}>{pago.estatus}</Text>
                  </View>
                </View>

                <Text style={styles.monto}>Importe: ${pago.monto}</Text>
                {pago.referencia_bancaria && (
                  <Text style={styles.referencia}>Folio: {pago.referencia_bancaria}</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#edf2f7', 
    backgroundColor: '#fff' 
  },
  btnBack: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E7F3EC' },
  backBtnText: { color: '#0F7F41', fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F7F41' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600' },
  pagoCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    marginBottom: 12 
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  concepto: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 },
  monto: { fontSize: 14, color: '#0F7F41', marginTop: 4, fontWeight: '800' },
  referencia: { fontSize: 12, color: '#841B44', marginTop: 2, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  btnAction: { 
    marginTop: 12, 
    backgroundColor: '#E66711', // Naranja para llamadas de acción financiera
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
    borderColor: '#0F7F41' 
  },
  formTitle: { fontSize: 20, fontWeight: '900', color: '#0F7F41', textAlign: 'center' },
  formSubtitle: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  formMonto: { fontSize: 15, color: '#E66711', fontWeight: '800', textAlign: 'center', marginTop: 6, marginBottom: 20 },
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
    backgroundColor: '#0F7F41', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#841B44', fontSize: 14, fontWeight: '700' }
});