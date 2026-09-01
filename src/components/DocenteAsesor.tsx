import React, { useEffect, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface DocenteAsesoriaProps {
  docenteId: number;
  usuarioId: number;
  onBack: () => void;
}

const limpiarTextoPHP = (texto: any): string => {
  if (!texto || typeof texto !== 'string') return '';
  if (texto.includes('s:') && texto.includes('"')) {
    const matches = texto.match(/s:\d+:"([^"]+)"/g);
    if (matches) {
      return matches.map(m => m.replace(/s:\d+:"([^"]+)"/, '$1')).join(' ');
    }
  }
  return texto;
};

export default function DocenteAsesoriaView({ docenteId, usuarioId, onBack }: DocenteAsesoriaProps) {
  const { colors } = useTheme();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoProyectoId, setEditandoProyectoId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState<{ [key: number]: string }>({});

  const obtenerProyectosAsignados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/proyectos-titulacion`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.data || [];
      const asignados = lista.filter((p: any) => p.docente_asesor_id === docenteId);
      setProyectos(asignados);

      const obsIniciales: any = {};
      asignados.forEach((p: any) => {
        obsIniciales[p.id] = p.observaciones_revisor || '';
      });
      setObservaciones(obsIniciales);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron recuperar los proyectos asesorados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerProyectosAsignados();
  }, [docenteId]);

  const handleActualizarEstatus = async (proyectoId: number, nuevoEstatus: string) => {
    setLoading(true);
    
    const payload: any = {
      estatus: nuevoEstatus,
      observaciones_revisor: observaciones[proyectoId] || null,
    };

    if (usuarioId && !isNaN(Number(usuarioId))) {
      payload.revisado_por_usuario_id = Number(usuarioId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/proyectos-titulacion/${proyectoId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok) {
        Alert.alert('Estatus Actualizado', `El proyecto ahora está: ${nuevoEstatus.replace('_', ' ')}.`);
        setEditandoProyectoId(null);
        await obtenerProyectosAsignados();
      } else {
        const errorMsg = resData.message || (resData.errors ? Object.values(resData.errors).flat().join('\n') : 'Error al actualizar');
        Alert.alert('Error del Servidor', errorMsg);
      }
    } catch (error: any) {
      Alert.alert('Error de Red', error.message || 'No se pudo conectar con la API.');
    } finally {
      setLoading(false);
    }
  };

  const getEstatusStyle = (estatus: string) => {
    switch (estatus) {
      case 'Liberado_Exposicion':
      case 'Aprobado':
        return { bg: colors.primaryLight, text: colors.primary, border: colors.primary };
      case 'En_Revision':
      case 'Pendiente':
        return { bg: colors.accentLight, text: colors.accent, border: colors.accent };
      case 'Rechazado':
        return { bg: colors.wineLight, text: colors.wine, border: colors.wine };
      default:
        return { bg: colors.accentLight, text: colors.accent, border: colors.accent };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.btnBack, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.btnBackText, { color: colors.primary }]}>← Volver al Panel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Asesoría de Titulación</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>Proyectos Asignados bajo tu Asesoría</Text>
          <Text style={styles.infoBannerSub}>
            Revisa el avance de los alumnos y libera su proyecto cuando cumpla con los requisitos para su exposición.
          </Text>
        </View>

        {loading && editandoProyectoId === null ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : proyectos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📑</Text>
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>Sin proyectos asignados</Text>
            <Text style={styles.emptySubtitle}>No tienes alumnos vinculados como asesor actualmente.</Text>
          </View>
        ) : (
          proyectos.map((proyecto) => {
            const estatusStyle = getEstatusStyle(proyecto.estatus);
            const isEditing = editandoProyectoId === proyecto.id;
            const alumnoNombre = `${limpiarTextoPHP(proyecto.alumno?.nombre)} ${limpiarTextoPHP(proyecto.alumno?.apellido_paterno)} ${limpiarTextoPHP(proyecto.alumno?.apellido_materno || '')}`;

            return (
              <View key={proyecto.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.badgeEstatus, { backgroundColor: estatusStyle.bg, borderColor: estatusStyle.border }]}>
                    <Text style={[styles.badgeEstatusText, { color: estatusStyle.text }]}>
                      {proyecto.estatus ? proyecto.estatus.replace('_', ' ') : 'Pendiente'}
                    </Text>
                  </View>
                  <Text style={styles.modalidadText}>{proyecto.modalidad || 'Proyecto'}</Text>
                </View>

                <Text style={[styles.projectTitle, { color: colors.textPrimary }]}>{proyecto.titulo}</Text>

                <View style={styles.alumnoInfoBox}>
                  <Text style={styles.alumnoLabel}>🎓 Alumno:</Text>
                  <Text style={[styles.alumnoName, { color: colors.primary }]}>{alumnoNombre}</Text>
                  <Text style={styles.especialidadText}>Especialidad: {proyecto.especialidad_historica}</Text>
                </View>

                {proyecto.resumen && (
                  <View style={styles.resumenContainer}>
                    <Text style={styles.resumenLabel}>Resumen:</Text>
                    <Text style={styles.resumenText}>{proyecto.resumen}</Text>
                  </View>
                )}

                {/* Estatus de Entregables */}
                <View style={styles.linksRow}>
                  <View style={[styles.linkPill, proyecto.documento_url ? { backgroundColor: colors.primaryLight } : null]}>
                    <Text style={[styles.linkPillText, proyecto.documento_url ? { color: colors.primary, fontWeight: '700' } : null]}>
                      {proyecto.documento_url ? '📄 Documento listo' : '📄 Sin documento'}
                    </Text>
                  </View>
                  <View style={[styles.linkPill, proyecto.presentacion_url ? { backgroundColor: colors.primaryLight } : null]}>
                    <Text style={[styles.linkPillText, proyecto.presentacion_url ? { color: colors.primary, fontWeight: '700' } : null]}>
                      {proyecto.presentacion_url ? '📊 Diapositivas listas' : '📊 Sin diapositivas'}
                    </Text>
                  </View>
                  <View style={[styles.linkPill, proyecto.video_url ? { backgroundColor: colors.primaryLight } : null]}>
                    <Text style={[styles.linkPillText, proyecto.video_url ? { color: colors.primary, fontWeight: '700' } : null]}>
                      {proyecto.video_url ? '🎥 Video listo' : '🎥 Sin video'}
                    </Text>
                  </View>
                </View>

                {/* Formulario de Evaluación / Liberación */}
                {isEditing ? (
                  <View style={[styles.evaluacionBox, { borderColor: colors.primary }]}>
                    <Text style={[styles.evaluacionTitle, { color: colors.primary }]}>Evaluación y Dictamen del Asesor</Text>

                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Observaciones / Retroalimentación:</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Escribe recomendaciones, correcciones o felicitaciones..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      value={observaciones[proyecto.id] || ''}
                      onChangeText={(txt) => setObservaciones({ ...observaciones, [proyecto.id]: txt })}
                    />

                    <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Asignar Nuevo Estatus:</Text>
                    <View style={styles.botonesEstatusRow}>
                      <TouchableOpacity
                        style={[styles.btnEstatus, { backgroundColor: colors.primary }]}
                        onPress={() => handleActualizarEstatus(proyecto.id, 'Liberado_Exposicion')}
                        disabled={loading}
                      >
                        <Text style={styles.btnEstatusText}>✓ Liberar para Exposición</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnEstatus, { backgroundColor: colors.accent }]}
                        onPress={() => handleActualizarEstatus(proyecto.id, 'En_Revision')}
                        disabled={loading}
                      >
                        <Text style={styles.btnEstatusText}>⏳ En Revisión</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnEstatus, { backgroundColor: colors.wine }]}
                        onPress={() => handleActualizarEstatus(proyecto.id, 'Rechazado')}
                        disabled={loading}
                      >
                        <Text style={styles.btnEstatusText}>✕ Rechazar / Corregir</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.btnCancelar}
                      onPress={() => setEditandoProyectoId(null)}
                    >
                      <Text style={[styles.btnCancelarText, { color: colors.wine }]}>Cerrar Evaluación</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {proyecto.observaciones_revisor && (
                      <View style={[styles.observacionPrevia, { backgroundColor: colors.wineLight, borderColor: colors.wine }]}>
                        <Text style={[styles.observacionPreviaLabel, { color: colors.wine }]}>Última Observación:</Text>
                        <Text style={[styles.observacionPreviaText, { color: colors.wine }]}>{proyecto.observaciones_revisor}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.btnEvaluar, { backgroundColor: colors.primary }]}
                      onPress={() => setEditandoProyectoId(proyecto.id)}
                    >
                      <Text style={styles.btnEvaluarText}>⚖️ Evaluar / Cambiar Estatus del Proyecto</Text>
                    </TouchableOpacity>
                  </View>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
  },
  btnBack: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnBackText: { fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  infoBanner: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  infoBannerTitle: { fontSize: 14, fontWeight: '800' },
  infoBannerSub: { fontSize: 12, color: '#2d3748', marginTop: 3, lineHeight: 16 },
  emptyCard: {
    padding: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeEstatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeEstatusText: { fontSize: 11, fontWeight: '800' },
  modalidadText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  projectTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  alumnoInfoBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 8 },
  alumnoLabel: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  alumnoName: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  especialidadText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  resumenContainer: { marginBottom: 8 },
  resumenLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  resumenText: { fontSize: 12, color: '#334155', lineHeight: 16 },
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  linkPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  linkPillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  observacionPrevia: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  observacionPreviaLabel: { fontSize: 11, fontWeight: '800' },
  observacionPreviaText: { fontSize: 12, marginTop: 2 },
  btnEvaluar: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnEvaluarText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  evaluacionBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  evaluacionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  textArea: {
    height: 70,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: '#ffffff',
    fontSize: 12,
    color: '#1e293b',
    textAlignVertical: 'top',
  },
  botonesEstatusRow: { gap: 6, marginTop: 6 },
  btnEstatus: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnEstatusText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  btnCancelar: { marginTop: 8, alignItems: 'center', paddingVertical: 4 },
  btnCancelarText: { fontSize: 12, fontWeight: '700' },
});