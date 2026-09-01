import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface ProyectoTitulacionProps {
  alumnoId: number;
  especialidadAlumno?: string;
  onBack: () => void;
}

export default function ProyectoTitulacionView({ alumnoId, onBack }: ProyectoTitulacionProps) {
  const { colors } = useTheme();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para editar la documentación del proyecto
  const [proyectoEditandoId, setProyectoEditandoId] = useState<number | null>(null);
  const [archivoDoc, setArchivoDoc] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [archivoPres, setArchivoPres] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  const obtenerProyectos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/proyectos-titulacion`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.data || [];
      setProyectos(lista.filter((p: any) => p.alumno_id === alumnoId));
    } catch (error) {
      Alert.alert('Error', 'No se pudieron recuperar los datos de titulación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerProyectos();
  }, [alumnoId]);

  const seleccionarDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setArchivoDoc(result.assets[0]);
      }
    } catch (err) {
      console.error('Error al seleccionar documento:', err);
    }
  };

  const seleccionarPresentacion = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setArchivoPres(result.assets[0]);
      }
    } catch (err) {
      console.error('Error al seleccionar presentación:', err);
    }
  };

  const handleIniciarEdicionDocumentos = (proyecto: any) => {
    setProyectoEditandoId(proyecto.id);
    setArchivoDoc(null);
    setArchivoPres(null);
    setVideoUrl(proyecto.video_url || '');
  };

  const handleSubirArchivos = async (proyectoId: number) => {
    if (!archivoDoc && !archivoPres && !videoUrl.trim()) {
      Alert.alert('Aviso', 'Adjunta al menos un archivo o ingresa el enlace de video para actualizar.');
      return;
    }

    setLoading(true);
    const formData = new FormData();

    const agregarArchivoAFormData = (nombreCampo: string, asset: DocumentPicker.DocumentPickerAsset) => {
      if (Platform.OS === 'web') {
        if (asset.file) {
          formData.append(nombreCampo, asset.file);
        }
      } else {
        formData.append(nombreCampo, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }
    };

    if (archivoDoc) agregarArchivoAFormData('documento_file', archivoDoc);
    if (archivoPres) agregarArchivoAFormData('presentacion_file', archivoPres);
    if (videoUrl.trim()) formData.append('video_url', videoUrl.trim());

    formData.append('_method', 'PUT');

    try {
      const response = await fetch(`${API_BASE_URL}/proyectos-titulacion/${proyectoId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Entregables de titulación actualizados correctamente.');
        setProyectoEditandoId(null);
        setArchivoDoc(null);
        setArchivoPres(null);
        setVideoUrl('');
        obtenerProyectos();
      } else {
        throw new Error();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar los cambios en los documentos.');
    } finally {
      setLoading(false);
    }
  };

  const getEstatusStyle = (estatus: string) => {
    switch (estatus) {
      case 'Aprobado':
      case 'Liberado_Exposicion':
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
      {/* Cabecera */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.btnBack, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.btnBackText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Titulación Escolar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && proyectoEditandoId === null ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : proyectos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📑</Text>
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>Sin proyecto asignado</Text>
            <Text style={styles.emptySubtitle}>Actualmente no cuentas con un registro de titulación activo.</Text>
          </View>
        ) : (
          proyectos.map((proyecto) => {
            const estatusStyle = getEstatusStyle(proyecto.estatus);
            const isEditing = proyectoEditandoId === proyecto.id;

            return (
              <View key={proyecto.id} style={[styles.proyectoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeEstatus, { backgroundColor: estatusStyle.bg, borderColor: estatusStyle.border }]}>
                    <Text style={[styles.badgeEstatusText, { color: estatusStyle.text }]}>
                      {proyecto.estatus ? proyecto.estatus.replace('_', ' ') : 'Pendiente'}
                    </Text>
                  </View>
                  <Text style={styles.modalidadText}>{proyecto.modalidad || 'Proyecto'}</Text>
                </View>

                <Text style={[styles.proyectoTitulo, { color: colors.textPrimary }]}>{proyecto.titulo}</Text>

                {proyecto.resumen && (
                  <Text style={styles.proyectoResumen}>{proyecto.resumen}</Text>
                )}

                {proyecto.docente_asesor && (
                  <Text style={[styles.asesorText, { color: colors.primary }]}>
                    👨‍🏫 Asesor: {proyecto.docente_asesor.nombre} {proyecto.docente_asesor.apellido_paterno}
                  </Text>
                )}

                {proyecto.observaciones_revisor && (
                  <View style={[styles.observacionesBox, { backgroundColor: colors.wineLight, borderColor: colors.wine }]}>
                    <Text style={[styles.observacionesLabel, { color: colors.wine }]}>Observaciones del Revisor:</Text>
                    <Text style={[styles.observacionesText, { color: colors.wine }]}>{proyecto.observaciones_revisor}</Text>
                  </View>
                )}

                {/* FORMULARIO DE EDICIÓN O VISTA DE ARCHIVOS */}
                {isEditing ? (
                  <View style={[styles.editDocsContainer, { borderColor: colors.primary }]}>
                    <Text style={[styles.editDocsTitle, { color: colors.primary }]}>Entregables del Proyecto</Text>

                    {/* Selector de Archivo PDF/Word */}
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Documento del Proyecto (PDF / Word):</Text>
                    <TouchableOpacity style={[styles.filePickerButton, { borderColor: colors.primary }]} onPress={seleccionarDocumento}>
                      <Text style={[styles.filePickerButtonText, { color: colors.primary }]}>📎 Seleccionar Archivo</Text>
                    </TouchableOpacity>
                    {archivoDoc && (
                      <Text style={[styles.selectedFileText, { color: colors.accent }]}>Archivo: {archivoDoc.name}</Text>
                    )}

                    {/* Selector de Archivo Diapositivas */}
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 12 }]}>Presentación (PDF / PowerPoint):</Text>
                    <TouchableOpacity style={[styles.filePickerButton, { borderColor: colors.primary }]} onPress={seleccionarPresentacion}>
                      <Text style={[styles.filePickerButtonText, { color: colors.primary }]}>📊 Seleccionar Diapositivas</Text>
                    </TouchableOpacity>
                    {archivoPres && (
                      <Text style={[styles.selectedFileText, { color: colors.accent }]}>Archivo: {archivoPres.name}</Text>
                    )}

                    {/* Campo de Enlace para Video */}
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 12 }]}>Enlace a Video Demo / Exposición:</Text>
                    <TextInput
                      style={styles.inputUrl}
                      placeholder="https://youtube.com/... o enlace de Drive"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      value={videoUrl}
                      onChangeText={setVideoUrl}
                    />

                    {/* Botones de Acción */}
                    <View style={styles.editButtonsRow}>
                      <TouchableOpacity 
                        style={[styles.btnGuardarEdicion, { backgroundColor: colors.primary }]} 
                        onPress={() => handleSubirArchivos(proyecto.id)}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.btnGuardarEdicionText}>Guardar Entregables</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.btnCancelarEdicion, { backgroundColor: colors.wineLight, borderColor: colors.wine }]} 
                        onPress={() => setProyectoEditandoId(null)}
                      >
                        <Text style={[styles.btnCancelarEdicionText, { color: colors.wine }]}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.linksRow}>
                      {proyecto.documento_url ? (
                        <View style={[styles.linkPill, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.linkPillActiveText, { color: colors.primary }]}>📄 Documento entregado</Text>
                        </View>
                      ) : (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>📄 Sin documento</Text>
                        </View>
                      )}

                      {proyecto.presentacion_url ? (
                        <View style={[styles.linkPill, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.linkPillActiveText, { color: colors.primary }]}>📊 Presentación entregada</Text>
                        </View>
                      ) : (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>📊 Sin presentación</Text>
                        </View>
                      )}

                      {proyecto.video_url ? (
                        <View style={[styles.linkPill, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.linkPillActiveText, { color: colors.primary }]}>🎥 Video vinculado</Text>
                        </View>
                      ) : (
                        <View style={styles.linkPill}>
                          <Text style={styles.linkPillText}>🎥 Sin enlace de video</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity 
                      style={[styles.btnEditarDocs, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
                      onPress={() => handleIniciarEdicionDocumentos(proyecto)}
                    >
                      <Text style={[styles.btnEditarDocsText, { color: colors.accent }]}>📤 Subir Documentos / Editar Enlace</Text>
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
  emptyCard: {
    padding: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  proyectoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
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
  proyectoTitulo: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  proyectoResumen: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  asesorText: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  observacionesBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  observacionesLabel: { fontSize: 11, fontWeight: '800' },
  observacionesText: { fontSize: 12, marginTop: 2 },
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 10 },
  linkPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  linkPillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  linkPillActiveText: { fontSize: 11, fontWeight: '700' },
  btnEditarDocs: {
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnEditarDocsText: { fontWeight: '800', fontSize: 13 },
  editDocsContainer: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
  },
  editDocsTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  filePickerButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  filePickerButtonText: { fontWeight: '800', fontSize: 13 },
  selectedFileText: { fontSize: 12, fontWeight: '700', marginTop: 4, marginLeft: 2 },
  inputUrl: {
    height: 46,
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    fontSize: 13,
  },
  editButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnGuardarEdicion: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGuardarEdicionText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  btnCancelarEdicion: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarEdicionText: { fontWeight: '700', fontSize: 13 },
});