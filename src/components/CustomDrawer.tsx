import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = 'https://apisuie.onrender.com/api';

interface CustomDrawerProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  userInfo?: any;
  onLogout: () => void;
  onNavigateHome?: () => void;
  onNavigatePagos?: () => void;
  onNavigateTitulacion?: () => void;
  onNavigateAsesoria?: () => void;
  onNavigateAdminTheme?: () => void;
  semestreAlumno?: number;
  proyectosAsesoradosCount?: number;
}

const limpiarTextoPHP = (texto: any): string => {
  if (!texto || typeof texto !== 'string') return '';
  if (texto.includes('s:') && texto.includes('"')) {
    const matches = texto.match(/s:\d+:"([^"]+)"/g);
    if (matches) {
      return matches.map((m) => m.replace(/s:\d+:"([^"]+)"/, '$1')).join(' ');
    }
  }
  return texto;
};

export default function CustomDrawer({
  visible,
  onClose,
  user,
  userInfo,
  onLogout,
  onNavigateHome,
  onNavigatePagos,
  onNavigateTitulacion,
  onNavigateAsesoria,
  onNavigateAdminTheme,
  semestreAlumno = 0,
  proyectosAsesoradosCount = 0,
}: CustomDrawerProps) {
  const { colors } = useTheme();
  const [conteoAsesorados, setConteoAsesorados] = useState<number>(proyectosAsesoradosCount);
  const [nombreObtenidoAPI, setNombreObtenidoAPI] = useState<string>('');
  const [rolObtenidoAPI, setRolObtenidoAPI] = useState<string>('');

  // Normalización y detección de rol multidireccional
  const rolDetectado = (
    user?.rol ||
    user?.tipo ||
    user?.tipo_usuario ||
    userInfo?.rol ||
    rolObtenidoAPI ||
    ''
  ).toString().trim().toLowerCase();

  const esAdmin = rolDetectado.includes('admin') || rolDetectado.includes('director') || rolDetectado.includes('control');
  const esDocente = rolDetectado.includes('docente') || rolDetectado.includes('profesor');
  
  // Si no es Admin ni Docente, por defecto es Estudiante
  const esEstudiante = rolDetectado.includes('estudiante') || rolDetectado.includes('alumno') || (!esAdmin && !esDocente);

  // EFECTO 1: Consulta a la API para verificar nombre y rol exacto al abrir el menú
  useEffect(() => {
    if (visible) {
      const cargarDatosDesdeAPI = async () => {
        try {
          const idBuscado = userInfo?.usuario_id || user?.id || userInfo?.id;

          // Intentar coincidencia en Alumnos
          const resAlumnos = await fetch(`${API_BASE_URL}/alumnos`);
          if (resAlumnos.ok) {
            const data = await resAlumnos.json();
            const lista = Array.isArray(data) ? data : data.data || [];
            const coincidencia = lista.find(
              (a: any) => a.usuario_id === idBuscado || a.id === userInfo?.id || a.id === idBuscado
            );
            if (coincidencia) {
              const nom = limpiarTextoPHP(coincidencia.nombre || coincidencia.nombre_alumno || '');
              const ape = limpiarTextoPHP(coincidencia.apellido_paterno || coincidencia.apellidos || '');
              if (nom) setNombreObtenidoAPI(`${nom} ${ape}`.trim());
              setRolObtenidoAPI('Estudiante');
              return;
            }
          }

          // Intentar coincidencia en Docentes
          const resDocentes = await fetch(`${API_BASE_URL}/docentes`);
          if (resDocentes.ok) {
            const data = await resDocentes.json();
            const lista = Array.isArray(data) ? data : data.data || [];
            const coincidencia = lista.find(
              (d: any) => d.usuario_id === idBuscado || d.id === userInfo?.id || d.id === idBuscado
            );
            if (coincidencia) {
              const nom = limpiarTextoPHP(coincidencia.nombre || coincidencia.nombre_docente || '');
              const ape = limpiarTextoPHP(coincidencia.apellido_paterno || coincidencia.apellidos || '');
              if (nom) setNombreObtenidoAPI(`${nom} ${ape}`.trim());
              setRolObtenidoAPI('Docente');
              return;
            }
          }
        } catch (e) {
          console.error('Error al consultar datos en la API:', e);
        }
      };

      cargarDatosDesdeAPI();
    }
  }, [visible, userInfo, user]);

  // EFECTO 2: Consulta API para validar proyectos de asesoría docente
  useEffect(() => {
    if (visible && esDocente) {
      const docenteId = userInfo?.id || user?.id;
      const verificarProyectosAPI = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/proyectos-titulacion`);
          if (res.ok) {
            const data = await res.json();
            const lista = Array.isArray(data) ? data : data.data || [];
            const asignados = lista.filter((p: any) => p.docente_asesor_id === docenteId);
            setConteoAsesorados(asignados.length);
          }
        } catch (e) {
          console.error('Error verificando proyectos en API:', e);
        }
      };
      verificarProyectosAPI();
    }
  }, [visible, esDocente, userInfo?.id, user?.id]);

  // Si semestreAlumno es 0, no definido o 6, permitimos el acceso a titulación
  const semNum = Number(semestreAlumno || userInfo?.semestre || 6);
  const puedeAccederTitulacion = semNum === 6 || semNum === 0;
  const tieneAsesorados = conteoAsesorados > 0 || proyectosAsesoradosCount > 0;

 // Manejador genérico para ejecutar la navegación tras cerrar el Modal
const ejecutarNavegacion = (callback?: () => void) => {
  onClose();
  if (callback) {
    // Se da un margen de 100ms para que el Modal de React Native libere la vista
    setTimeout(() => {
      callback();
    }, 100);
  }
};

const handleTitulacionPress = () => {
  if (!puedeAccederTitulacion) {
    Alert.alert(
      'Módulo Bloqueado',
      `El módulo de titulación está disponible para alumnos de 6° semestre.`
    );
    return;
  }
  ejecutarNavegacion(onNavigateTitulacion);
};

  const handleAsesoriaPress = () => {
    if (!tieneAsesorados) {
      Alert.alert(
        'Módulo Bloqueado',
        'Actualmente no tienes proyectos de titulación asignados como docente asesor.'
      );
      return;
    }
    onClose();
    if (onNavigateAsesoria) onNavigateAsesoria();
  };

  const construirNombreUsuario = (): string => {
    if (nombreObtenidoAPI.trim()) {
      return nombreObtenidoAPI;
    }

    const nomInfo = limpiarTextoPHP(
      userInfo?.nombre || userInfo?.nombre_docente || userInfo?.nombre_alumno || userInfo?.name || ''
    );
    const apeInfo = limpiarTextoPHP(
      userInfo?.apellido_paterno || userInfo?.apellidos || userInfo?.apellido || ''
    );
    if (nomInfo) {
      return `${nomInfo} ${apeInfo}`.trim();
    }

    const nomUser = limpiarTextoPHP(user?.nombre || user?.name || '');
    const apeUser = limpiarTextoPHP(user?.apellido_paterno || user?.apellidos || '');
    if (nomUser) {
      return `${nomUser} ${apeUser}`.trim();
    }

    if (user?.username || user?.usuario || user?.clave) {
      return (user?.username || user?.usuario || user?.clave).toString();
    }

    return 'Usuario SUIE';
  };

  const nombreFinal = construirNombreUsuario();
  const rolTextoHeader =
    user?.rol ||
    (esEstudiante ? 'Estudiante' : esDocente ? 'Docente' : esAdmin ? 'Administrador' : 'Usuario');

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.drawerOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.drawerBackdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.drawerContent, { backgroundColor: colors.cardBg }]}>
          {/* Encabezado */}
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.primary }}>
            <View style={[styles.drawerHeader, { backgroundColor: colors.primary }]}>
              <View style={styles.drawerAvatar}>
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
              <Text style={styles.drawerUserName} numberOfLines={2}>
                {nombreFinal}
              </Text>
              <Text style={styles.drawerUserRole}>{rolTextoHeader}</Text>
            </View>
          </SafeAreaView>

          {/* Opciones del Menú */}
          <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
            {/* 1. Opciones de Estudiante */}
            {esEstudiante && (
              <>
                {/* Opción Horario / Inicio */}
<TouchableOpacity
  style={styles.drawerItem}
  onPress={() => ejecutarNavegacion(onNavigateHome)}
>
  <Text style={styles.drawerItemIcon}>📅</Text>
  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Horario Escolar</Text>
</TouchableOpacity>

{/* Opción Finanzas y Pagos */}
<TouchableOpacity
  style={styles.drawerItem}
  onPress={() => ejecutarNavegacion(onNavigatePagos)}
>
  <Text style={styles.drawerItemIcon}>💳</Text>
  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Finanzas y Pagos</Text>
</TouchableOpacity>

{/* Opción Proyecto de Titulación */}
<TouchableOpacity style={styles.drawerItem} onPress={handleTitulacionPress}>
  <Text style={styles.drawerItemIcon}>{puedeAccederTitulacion ? '🎓' : '🔒'}</Text>
  <Text style={[styles.drawerItemText, { color: puedeAccederTitulacion ? colors.textPrimary : '#94a3b8' }]}>
    Proyecto de Titulación
  </Text>
</TouchableOpacity>
              </>
            )}

            {/* 2. Opciones de Docente */}
            {esDocente && (
              <>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    onClose();
                    if (onNavigateHome) onNavigateHome();
                  }}
                >
                  <Text style={styles.drawerItemIcon}>📋</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>
                    Pase de Lista y Clases
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={handleAsesoriaPress}>
                  <Text style={styles.drawerItemIcon}>{tieneAsesorados ? '👨‍🏫' : '🔒'}</Text>
                  <Text
                    style={[
                      styles.drawerItemText,
                      { color: tieneAsesorados ? colors.textPrimary : '#94a3b8' },
                    ]}
                  >
                    Asesoría de Titulación
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* 3. Opciones de Administrador */}
            {esAdmin && (
              <>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    onClose();
                    if (onNavigateHome) onNavigateHome();
                  }}
                >
                  <Text style={styles.drawerItemIcon}>🖥️</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>
                    Inicio Administrador
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    onClose();
                    if (onNavigateAdminTheme) onNavigateAdminTheme();
                  }}
                >
                  <Text style={styles.drawerItemIcon}>🎨</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>
                    Configurar Veda & Tema
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* Botón Cerrar Sesión */}
          <SafeAreaView edges={['bottom']} style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.drawerLogoutBtn}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <Text style={styles.drawerLogoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContent: {
    width: '80%',
    maxWidth: 300,
    height: '100%',
    zIndex: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '5px 0px 25px rgba(0, 0, 0, 0.2)' }
      : {
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 5, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }),
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 16,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  drawerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerUserName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  drawerUserRole: { color: '#e2f4ff', fontSize: 12, marginTop: 4, fontWeight: '600' },
  drawerBody: { flex: 1, paddingVertical: 8 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  drawerItemIcon: { fontSize: 20 },
  drawerItemText: { fontSize: 14, fontWeight: '700' },
  drawerFooter: { padding: 16, borderTopWidth: 1 },
  drawerLogoutBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawerLogoutText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },
});