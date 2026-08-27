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

interface ProyectoTitulacionProps {
  alumnoId: number;
  especialidadAlumno?: string;
  onBack: () => void;
}

export default function ProyectoTitulacionView({ alumnoId, especialidadAlumno, onBack }: ProyectoTitulacionProps) {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Campos del formulario según las columnas de la BD
  const [titulo, setTitulo] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [resumen, setResumen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [presentacionUrl, setPresentacionUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const obtenerProyectos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/proyectos-titulacion`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.data || [];
      // Filtrar los proyectos de este alumno
      setProyectos(lista.filter((p: any) => p.alumno_id === alumnoId));
    } catch (error) {
      Alert.alert('Error', 'No se pudieron recuperar los proyectos de titulación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerProyectos();
  }, [alumnoId]);

  const handleGuardarProyecto = async () => {
    if (!titulo.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el título del proyecto.');
      return;
    }

    setLoading(true);
    const payload = {
      alumno_id: alumnoId,
      titulo: titulo.trim(),
      modalidad: modalidad.trim() || 'Proyecto Académico',
      resumen: resumen.trim() || null,
      descripcion: descripcion.trim() || null,
      especialidad_historica: especialidadAlumno || 'General',
      documento_url: documentoUrl.trim() || null,
      presentacion_url: presentacionUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      estatus: 'Pendiente',
    };

    try {
      const response = await fetch(`${API_BASE_URL}/proyectos-titulacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Proyecto de titulación enviado para revisión.');
        setMostrarFormulario(false);
        setTitulo('');
        setModalidad('');
        setResumen('');
        setDescripcion('');
        setDocumentoUrl('');
        setPresentacionUrl('');
        setVideoUrl('');
        obtenerProyectos();
      } else {
        throw new Error();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el proyecto.');
    } finally {
      setLoading(false);
    }
  };

  const getEstatusStyle = (estatus: string) => {
    switch (estatus) {
      case 'Aprobado':
        return { bg: '#E7F3EC', text: '#0F7F41', border: '#0F7F41' };
      case 'Liberado_Exposicion':
        return { bg: '#E7F3EC', text: '#0F7F41', border: '#0F7F41' };
      case 'En_Revision':
        return { bg: '#FDEEE4', text: '#E66711', border: '#E66711' };
      case 'Rechazado':
        return { bg: '#F5E8ED', text: '#841B44', border: '#841B44' };
      default:
        return { bg: '#FDEEE4', text: '#E66711', border: '#E66711' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.btnBack}>
          <Text style={styles.btnBackText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Titulación Escolar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && !mostrarFormulario ? (
          <ActivityIndicator size="large" color="#0F7F41" style={{ marginTop: 40 }} />
        ) : mostrarFormulario ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Registrar Proyecto</Text>
            <Text style={styles.formSubtitle}>Ingresa los datos para la validación de tu titulación</Text>

            <Text style={styles.inputLabel}>Título del Proyecto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Sistema de Monitoreo de Residuos"
              placeholderTextColor="#9ca3af"
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={styles.inputLabel}>Modalidad de Titulación</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Memoria de Estadía / Tesis / Prototipo"
              placeholderTextColor="#9ca3af"
              value={modalidad}
              onChangeText={setModalidad}
            />

            <Text style={styles.inputLabel}>Resumen Ejecutivo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Breve resumen del objetivo y alcance..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              value={resumen}
              onChangeText={setResumen}
            />

            <Text style={styles.inputLabel}>Enlace al Documento (PDF / Drive)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#9ca3af"
              value={documentoUrl}
              onChangeText={setDocumentoUrl}
            />

            <Text style={styles.inputLabel}>Enlace a la Presentación</Text>
            <TextInput
              style={styles.input}
              placeholder="https://canva.com/... o enlace de diapositivas"
              placeholderTextColor="#9ca3af"
              value={presentacionUrl}
              onChangeText={setPresentacionUrl}
            />

            <Text style={styles.inputLabel}>Enlace a Video Demo / Exposición</Text>
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/..."
              placeholderTextColor="#9ca3af"
              value={videoUrl}
              onChangeText={setVideoUrl}
            />

            <TouchableOpacity style={styles.btnSubmit} onPress={handleGuardarProyecto} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Enviar para Revisión</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setMostrarFormulario(false)}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {proyectos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📑</Text>
                <Text style={styles.emptyTitle}>Sin proyectos registrados</Text>
                <Text style={styles.emptySubtitle}>Aún no has enviado ningún proyecto de titulación para revisión.</Text>
              </View>
            ) : (
              proyectos.map((proyecto) => {
                const estatusStyle = getEstatusStyle(proyecto.estatus);
                return (
                  <View key={proyecto.id} style={styles.proyectoCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.badgeEstatus, { backgroundColor: estatusStyle.bg, borderColor: estatusStyle.border }]}>
                        <Text style={[styles.badgeEstatusText, { color: estatusStyle.text }]}>
                          {proyecto.estatus ? proyecto.estatus.replace('_', ' ') : 'Pendiente'}
                        </Text>
                      </View>
                      <Text style={styles.modalidadText}>{proyecto.modalidad || 'Proyecto'}</Text>
                    </View>

                    <Text style={styles.proyectoTitulo}>{proyecto.titulo}</Text>

                    {proyecto.resumen && (
                      <Text style={styles.proyectoResumen}>{proyecto.resumen}</Text>
                    )}

                    {proyecto.docente_asesor && (
                      <Text style={styles.asesorText}>
                        👨‍🏫 Asesor: {proyecto.docente_asesor.nombre} {proyecto.docente_asesor.apellido_paterno}
                      </Text>
                    )}

                    {proyecto.observaciones_revisor && (
                      <View style={styles.observacionesBox}>
                        <Text style={styles.observacionesLabel}>Observaciones del Revisor:</Text>
                        <Text style={styles.observacionesText}>{proyecto.observaciones_revisor}</Text>
                      </View>
                    )}

                    <View style={styles.linksRow}>
                      {proyecto.documento_url && (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>📄 Documento listo</Text>
                        </View>
                      )}
                      {proyecto.presentacion_url && (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>📊 Diapositivas</Text>
                        </View>
                      )}
                      {proyecto.video_url && (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>🎥 Video</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  btnBack: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E7F3EC' },
  btnBackText: { color: '#0F7F41', fontWeight: '800', fontSize: 13 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F7F41' },
  scrollContent: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  btnNuevoProyecto: {
    backgroundColor: '#0F7F41',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnNuevoProyectoText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  emptyCard: {
    padding: 36,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F7F41' },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  proyectoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeEstatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeEstatusText: { fontSize: 11, fontWeight: '800' },
  modalidadText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  proyectoTitulo: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  proyectoResumen: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  asesorText: { fontSize: 12, color: '#0F7F41', fontWeight: '700', marginBottom: 8 },
  observacionesBox: {
    backgroundColor: '#F5E8ED',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#841B44',
    marginBottom: 8,
  },
  observacionesLabel: { fontSize: 11, fontWeight: '800', color: '#841B44' },
  observacionesText: { fontSize: 12, color: '#841B44', marginTop: 2 },
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  linkPill: { backgroundColor: '#FDEEE4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  linkPillText: { fontSize: 11, fontWeight: '700', color: '#E66711' },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0F7F41',
  },
  formTitle: { fontSize: 20, fontWeight: '900', color: '#0F7F41', textAlign: 'center' },
  formSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  input: {
    height: 48,
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: { height: 75, textAlignVertical: 'top', paddingTop: 10 },
  btnSubmit: {
    height: 50,
    backgroundColor: '#0F7F41',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  btnCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 6 },
  btnCancelText: { color: '#841B44', fontSize: 14, fontWeight: '700' },
});