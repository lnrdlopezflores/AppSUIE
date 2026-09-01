import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminPanelTheme from '../components/AdminPanelTheme';
import DocenteAsesoriaView from '../components/DocenteAsesor';
import ProyectoTitulacionView from '../components/ProyectoTitulacion';
import SubirPagos from '../components/SubirPagos';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const SPACING = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
};

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const getFechaLocalActual = (): string => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

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

const MAX_CONTENT_WIDTH = 600;

function MainApp() {
  const { colors, isVedaElectoral } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Control del Menú Lateral
  const [menuLateralVisible, setMenuLateralVisible] = useState(false);

  // Modal de Notificación Normativa Electoral
  const [mostrarModalNormativo, setMostrarModalNormativo] = useState(false);

  // Vistas Alumno
  const [vistaTitulacion, setVistaTitulacion] = useState(false);
  const [vistaPagos, setVistaPagos] = useState(false);

  // Vistas Docente
  const [vistaAsesoriaDocente, setVistaAsesoriaDocente] = useState(false);
  const [proyectosAsesoradosCount, setProyectosAsesoradosCount] = useState(0);

  // Vistas Admin
  const [vistaAdminTheme, setVistaAdminTheme] = useState(false);

  const [docenteInfo, setDocenteInfo] = useState<any>(null);
  const [cargasDocente, setCargasDocente] = useState<any[]>([]);
  const [selectedCarga, setSelectedCarga] = useState<any>(null);
  const [alumnosGrupo, setAlumnosGrupo] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<{ [key: number]: string }>({});
  const [observaciones, setObservaciones] = useState<{ [key: number]: string }>({});
  const [clasesCompletadas, setClasesCompletadas] = useState<number[]>([]);
  
  const [alumnoInfo, setAlumnoInfo] = useState<any>(null);
  const [horarioAlumno, setHorarioAlumno] = useState<any[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>('Lunes');

  const [fecha] = useState(getFechaLocalActual());

  useEffect(() => {
    if (user?.rol === 'Docente' && docenteInfo?.id) {
      const verificarYRecuperarHistorial = async () => {
        try {
          const llaveDocente = `clases_completadas_${fecha}_docente_${docenteInfo.id}`;
          let locales: number[] = [];
          
          if (Platform.OS === 'web') {
            const historialGuardado = localStorage.getItem(llaveDocente);
            if (historialGuardado) locales = JSON.parse(historialGuardado);
          } else {
            const historialGuardado = await SecureStore.getItemAsync(llaveDocente);
            if (historialGuardado) locales = JSON.parse(historialGuardado);
          }

          const resAsistencias = await fetch(`${API_BASE_URL}/asistencias`);
          if (resAsistencias.ok) {
            const todasAsistencias = await resAsistencias.json();
            const completadasEnBD = todasAsistencias
              .filter((asist: any) => asist.fecha === fecha)
              .map((asist: any) => asist.carga_academica_id);

            const historialFusionado = Array.from(new Set([...locales, ...completadasEnBD]));
            setClasesCompletadas(historialFusionado);
          }

          const resProyectos = await fetch(`${API_BASE_URL}/proyectos-titulacion`);
          if (resProyectos.ok) {
            const proyectosData = await resProyectos.json();
            const listaProyectos = Array.isArray(proyectosData) ? proyectosData : proyectosData.data || [];
            const asignados = listaProyectos.filter((p: any) => p.docente_asesor_id === docenteInfo.id);
            setProyectosAsesoradosCount(asignados.length);
          }
        } catch (e) {
          console.error('Error sincronizando estado:', e);
        }
      };

      verificarYRecuperarHistorial();
      cargarCargasDocente(docenteInfo.id);
    }
  }, [docenteInfo, fecha]);

  useEffect(() => {
    if (user?.rol === 'Estudiante' && alumnoInfo?.grupo_id) {
      cargarHorarioAlumno(alumnoInfo.grupo_id);
    }
  }, [alumnoInfo]);

  const verificarYNotificarVeda = () => {
    if (isVedaElectoral) {
      setMostrarModalNormativo(true);
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Aviso', 'Por favor ingresa tu matrícula o clave de usuario.');
      return;
    }
    setLoading(true);
    try {
      const resUsers = await fetch(`${API_BASE_URL}/usuarios`);
      if (!resUsers.ok) throw new Error(`Error en el servidor de usuarios (${resUsers.status}).`);
      
      const resData = await resUsers.json();
      const listaUsuarios = Array.isArray(resData) ? resData : resData.data || [];

      const inputBuscado = username.trim().toLowerCase();
      const foundUser = listaUsuarios.find((u: any) => {
        const userMatch = (u.username || '').toString().toLowerCase() === inputBuscado;
        const estaActivo = u.activo == 1 || u.activo === true || u.activo === '1' || u.activo === undefined;
        return userMatch && estaActivo;
      });

      if (!foundUser) {
        throw new Error('Usuario no encontrado o inactivo en el sistema.');
      }

      const rol = (foundUser.rol || '').toString().trim().toLowerCase();

      if (rol.includes('docente')) {
        const resDocentes = await fetch(`${API_BASE_URL}/docentes`);
        if (!resDocentes.ok) throw new Error(`Error al consultar docentes (${resDocentes.status}).`);

        const docentes = await resDocentes.json();
        const listaDocentes = Array.isArray(docentes) ? docentes : docentes.data || [];
        const foundDocente = listaDocentes.find((d: any) => d.usuario_id === foundUser.id);
        
        if (!foundDocente) throw new Error('No se encontraron datos asociados al docente.');
        
        setUser(foundUser);
        setDocenteInfo(foundDocente);
        verificarYNotificarVeda();

      } else if (rol.includes('estudiante') || rol.includes('alumno')) {
        const resAlumnos = await fetch(`${API_BASE_URL}/alumnos`);
        if (!resAlumnos.ok) throw new Error(`Error al consultar alumnos (${resAlumnos.status}).`);
        
        const alumnos = await resAlumnos.json();
        const listaAlumnos = Array.isArray(alumnos) ? alumnos : alumnos.data || [];
        const foundAlumno = listaAlumnos.find((a: any) => a.usuario_id === foundUser.id);
        
        if (!foundAlumno) throw new Error('No se encontraron datos asociados al alumno.');
        
        setUser(foundUser);
        setAlumnoInfo(foundAlumno);
        verificarYNotificarVeda();

      } else if (rol.includes('admin') || rol.includes('director') || rol.includes('control')) {
        setUser(foundUser);
        verificarYNotificarVeda();

      } else {
        throw new Error(`El rol "${foundUser.rol}" no tiene acceso configurado en esta app.`);
      }
    } catch (error: any) {
      Alert.alert('Error de Acceso', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const cargarCargasDocente = async (docenteId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/carga-academica`);
      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const responseData = await res.json();
      const lista = Array.isArray(responseData) ? responseData : responseData.data || [];
      setCargasDocente(lista.filter((c: any) => c.docente_id === docenteId));
    } catch (error) { 
      console.error('Error en cargas:', error); 
    }
  };

  const cargarHorarioAlumno = async (grupoId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/carga-academica`);
      const responseData = await res.json();
      const lista = Array.isArray(responseData) ? responseData : responseData.data || [];
      setHorarioAlumno(lista.filter((c: any) => c.grupo_id === grupoId));
    } catch (error) {
      console.error('Error en horario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCarga = async (carga: any) => {
    if (clasesCompletadas.includes(carga.id)) {
      Alert.alert('Asistencia Registrada', `Ya guardaste el pase de lista de hoy (${fecha}) para este grupo.`);
      return;
    }
    setSelectedCarga(carga);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/alumnos`);
      const data = await res.json();
      const asignados = data.filter((a: any) => a.grupo_id === carga.grupo_id);
      setAlumnosGrupo(asignados);

      const estadosIniciales: any = {};
      asignados.forEach((a: any) => { estadosIniciales[a.id] = 'Asistencia'; });
      setAsistencias(estadosIniciales);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron recuperar los alumnos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarAsistencia = async () => {
    setLoading(true);
    let guardados = 0;
    for (const alumno of alumnosGrupo) {
      const payload = {
        carga_academica_id: selectedCarga.id,
        alumno_id: alumno.id,
        fecha: fecha,
        estatus: asistencias[alumno.id],
        observacion: observaciones[alumno.id] || null
      };
      try {
        const response = await fetch(`${API_BASE_URL}/asistencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) guardados++;
      } catch (error) { console.error(error); }
    }

    setLoading(false);
    Alert.alert('Pase de Lista', `Completado para la fecha ${fecha}. Se registraron ${guardados} asistencias.`);
    
    const nuevasClases = [...clasesCompletadas, selectedCarga.id];
    setClasesCompletadas(nuevasClases);
    
    const llave = `clases_completadas_${fecha}_docente_${docenteInfo.id}`;
    if (Platform.OS === 'web') localStorage.setItem(llave, JSON.stringify(nuevasClases));
    else await SecureStore.setItemAsync(llave, JSON.stringify(nuevasClases));

    setSelectedCarga(null);
  };

  const handleLogout = () => {
    setUser(null);
    setDocenteInfo(null);
    setAlumnoInfo(null);
    setCargasDocente([]);
    setHorarioAlumno([]);
    setSelectedCarga(null);
    setUsername('');
    setClasesCompletadas([]);
    setVistaPagos(false);
    setVistaTitulacion(false);
    setVistaAsesoriaDocente(false);
    setVistaAdminTheme(false);
    setMostrarModalNormativo(false);
    setMenuLateralVisible(false);
    setProyectosAsesoradosCount(0);
  };

  // Componente Modal de Notificación de Veda
  const renderModalNormativo = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={mostrarModalNormativo}
      onRequestClose={() => setMostrarModalNormativo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconWrap}>
            <Text style={{ fontSize: 32 }}>⚖️</Text>
          </View>
          <Text style={styles.modalTitle}>Aviso Importante</Text>
          <Text style={styles.modalBody}>
            Para poder cumplir con la normativa de la ley estatal y federal en materia electoral, este sistema modificará sus contenidos temporalmente.
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={() => setMostrarModalNormativo(false)}
          >
            <Text style={styles.modalButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const rolNormalizado = (user?.rol || '').toString().toLowerCase();
  const semestreActual = Number(horarioAlumno[0]?.grupo?.semestre || alumnoInfo?.semestre || 0);
  const puedeAccederTitulacion = semestreActual === 6;
  const tieneAsesorados = proyectosAsesoradosCount > 0;

  // Componente Menú Lateral Desplegable
  const renderMenuLateral = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={menuLateralVisible}
      onRequestClose={() => setMenuLateralVisible(false)}
    >
      <View style={styles.drawerOverlay}>
        <TouchableWithoutFeedback onPress={() => setMenuLateralVisible(false)}>
          <View style={styles.drawerBackdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.drawerContent, { backgroundColor: colors.cardBg }]}>
          {/* Encabezado del Menú */}
          <View style={[styles.drawerHeader, { backgroundColor: colors.primary }]}>
            <View style={styles.drawerAvatar}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
            <Text style={styles.drawerUserName}>
              {alumnoInfo ? `${limpiarTextoPHP(alumnoInfo?.nombre)} ${limpiarTextoPHP(alumnoInfo?.apellido_paterno)}` : docenteInfo ? `Prof. ${limpiarTextoPHP(docenteInfo?.nombre)}` : user?.username}
            </Text>
            <Text style={styles.drawerUserRole}>{user?.rol}</Text>
          </View>

          {/* Opciones del Menú según el Rol */}
          <ScrollView style={styles.drawerBody}>
            {/* Opciones de Alumno */}
            {(rolNormalizado.includes('estudiante') || rolNormalizado.includes('alumno')) && (
              <>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setVistaPagos(false);
                    setVistaTitulacion(false);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>📅</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Horario Escolar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setVistaTitulacion(false);
                    setVistaPagos(true);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>💳</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Finanzas y Pagos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    if (!puedeAccederTitulacion) {
                      Alert.alert(
                        'Módulo Bloqueado',
                        `El módulo de titulación está disponible exclusivamente para alumnos inscritos en 6° semestre (Actualmente te encuentras en ${semestreActual > 0 ? semestreActual + '°' : 'semestre regular'}).`
                      );
                      return;
                    }
                    setVistaPagos(false);
                    setVistaTitulacion(true);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>{puedeAccederTitulacion ? '🎓' : '🔒'}</Text>
                  <Text style={[styles.drawerItemText, { color: puedeAccederTitulacion ? colors.textPrimary : '#94a3b8' }]}>
                    Proyecto de Titulación
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Opciones de Docente */}
            {rolNormalizado.includes('docente') && (
              <>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setVistaAsesoriaDocente(false);
                    setSelectedCarga(null);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>📋</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Pase de Lista y Clases</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    if (!tieneAsesorados) {
                      Alert.alert(
                        'Módulo Bloqueado',
                        'Actualmente no tienes proyectos de titulación asignados como docente asesor.'
                      );
                      return;
                    }
                    setSelectedCarga(null);
                    setVistaAsesoriaDocente(true);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>{tieneAsesorados ? '👨‍🏫' : '🔒'}</Text>
                  <Text style={[styles.drawerItemText, { color: tieneAsesorados ? colors.textPrimary : '#94a3b8' }]}>
                    Asesoría de Titulación
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Opciones de Administrador */}
            {(rolNormalizado.includes('admin') || rolNormalizado.includes('director') || rolNormalizado.includes('control')) && (
              <>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setVistaAdminTheme(false);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>🖥️</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Inicio Administrador</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setVistaAdminTheme(true);
                    setMenuLateralVisible(false);
                  }}
                >
                  <Text style={styles.drawerItemIcon}>🎨</Text>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>Configurar Veda & Tema</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* Botón Salir */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout}>
              <Text style={styles.drawerLogoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ============================================================
  // 1. VISTA: LOGIN
  // ============================================================
  if (!user) {
    return (
      <SafeAreaView style={[styles.loginBackground, { backgroundColor: colors.primaryLight }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginContainer}
        >
          <View style={[styles.modernCard, { borderColor: colors.primary }]}>
            <View style={styles.brandContainer}>
              <View style={[styles.logoBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={styles.logoBadgeText}>🏛️</Text>
              </View>
              <Text style={[styles.brandTitle, { color: colors.primary }]}>SUIE</Text>
              
              {!isVedaElectoral ? (
                <View style={[styles.tagOrgullo, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  <Text style={[styles.tagOrgulloText, { color: colors.accent }]}>#OrgullosamenteCECyTE13</Text>
                </View>
              ) : (
                <View style={[styles.tagOrgullo, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.tagOrgulloText, { color: colors.primary }]}>#OrgullosamenteCECyTE13</Text>
                </View>
              )}

              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                Sistema Unificado de Integración Educativa
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Identificación Institucional</Text>
              <View style={[styles.inputWrapper, inputFocused && { borderColor: colors.primary, backgroundColor: '#ffffff' }]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Matrícula, Control o Usuario Admin"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
              </View>

              <TouchableOpacity 
                style={[styles.btnLoginModern, { backgroundColor: colors.primary }, loading && styles.btnDisabled]} 
                onPress={handleLogin} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnLoginText}>Ingresar al Portal</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.loginFooter}>
              <Text style={[styles.footerNote, { color: colors.wine }]}>
                {isVedaElectoral ? 'CECyTE • EMSAD' : 'CECyTE • EMSAD Educación de Calidad'}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ============================================================
  // 2. VISTA: ADMINISTRADOR
  // ============================================================
  if (rolNormalizado.includes('admin') || rolNormalizado.includes('director') || rolNormalizado.includes('control')) {
    if (vistaAdminTheme) {
      return <AdminPanelTheme adminUser={user} onBack={() => setVistaAdminTheme(false)} />;
    }

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        {renderModalNormativo()}
        {renderMenuLateral()}
        <View style={styles.appHeader}>
          <TouchableOpacity style={styles.btnMenuDrawer} onPress={() => setMenuLateralVisible(true)}>
            <Text style={{ fontSize: 20 }}>☰</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitleCenter, { color: colors.primary }]}>Panel Administrador</Text>
            <Text style={styles.headerSubCenter}>Control Central</Text>
          </View>
          <TouchableOpacity 
            style={[styles.btnLogoutModern, { backgroundColor: colors.wineLight, borderColor: colors.wine }]} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnLogoutText, { color: colors.wine }]}>Salir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionHeading, { color: colors.primary, marginBottom: 14 }]}>
            Panel Central de Administración
          </Text>

          <View style={[styles.groupInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 4 }]}>
            <Text style={[styles.groupTitle, { color: colors.primary }]}>SUIE Core System</Text>
            <Text style={[styles.groupSpecialty, { color: colors.textSecondary }]}>
              Servidor activo: {API_BASE_URL}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================
  // 3. VISTA: ESTUDIANTE
  // ============================================================
  if (rolNormalizado.includes('estudiante') || rolNormalizado.includes('alumno')) {
    if (vistaPagos) {
      return <SubirPagos alumnoId={alumnoInfo?.id} onBack={() => setVistaPagos(false)} />;
    }

    if (vistaTitulacion) {
      return (
        <ProyectoTitulacionView
          alumnoId={alumnoInfo?.id}
          especialidadAlumno={horarioAlumno[0]?.grupo?.especialidad}
          onBack={() => setVistaTitulacion(false)}
        />
      );
    }

    const DIAS_MAP: { [key: string]: number } = {
      lunes: 1, lun: 1, lu: 1,
      martes: 2, mar: 2, ma: 2,
      miércoles: 3, miercoles: 3, mie: 3, mi: 3,
      jueves: 4, jue: 4, ju: 4,
      viernes: 5, vie: 5, vi: 5,
      sábado: 6, sabado: 6, sab: 6, sa: 6,
      domingo: 7, dom: 7, do: 7
    };

    const verificarPertenenciaAlDia = (item: any, diaActual: string): boolean => {
      const diaSeleccionadoNum = DIAS_MAP[diaActual.toLowerCase()];
      if (!diaSeleccionadoNum) return false;

      const diaDirecto = (item.dia || item.dias || item.dia_semana || '').toString().toLowerCase();
      if (diaDirecto && DIAS_MAP[diaDirecto]) {
        return DIAS_MAP[diaDirecto] === diaSeleccionadoNum;
      }

      const textoCompleto = `${item.horario || ''} ${item.dia || ''} ${item.descripcion || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const diaBuscadoSinAcento = diaActual.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const regexRango = /(lunes|martes|miercoles|jueves|viernes|lun|mar|mie|jue|vie)\s*(?:a|al|-)\s*(lunes|martes|miercoles|jueves|viernes|lun|mar|mie|jue|vie)/i;
      const matchRango = textoCompleto.match(regexRango);

      if (matchRango) {
        const numInicio = DIAS_MAP[matchRango[1]];
        const numFin = DIAS_MAP[matchRango[2]];
        if (numInicio && numFin) {
          return diaSeleccionadoNum >= Math.min(numInicio, numFin) && diaSeleccionadoNum <= Math.max(numInicio, numFin);
        }
      }

      const abrev = diaBuscadoSinAcento.substring(0, 3);
      const regexIndividual = new RegExp(`\\b(${diaBuscadoSinAcento}|${abrev})\\b`, 'i');
      return regexIndividual.test(textoCompleto);
    };

    const clasesDelDia = horarioAlumno.filter((item) => 
      verificarPertenenciaAlDia(item, diaSeleccionado)
    );

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        {renderModalNormativo()}
        {renderMenuLateral()}
        <View style={styles.appHeader}>
          <TouchableOpacity style={styles.btnMenuDrawer} onPress={() => setMenuLateralVisible(true)}>
            <Text style={{ fontSize: 20 }}>☰</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitleCenter, { color: colors.primary }]}>Portal Estudiante</Text>
            <Text style={styles.headerSubCenter}>CECyTE 13</Text>
          </View>
          <TouchableOpacity style={[styles.btnLogoutModern, { backgroundColor: colors.wineLight, borderColor: colors.wine }]} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={[styles.btnLogoutText, { color: colors.wine }]}>Salir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.groupInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.groupHeaderRow}>
              <View>
                <Text style={styles.groupMetaLabel}>GRUPO ASIGNADO</Text>
                <Text style={[styles.groupTitle, { color: colors.primary }]}>
                  {horarioAlumno[0]?.grupo?.semestre ? `${horarioAlumno[0]?.grupo?.semestre}° "${horarioAlumno[0]?.grupo?.grupo}"` : 'Grupo Asignado'}
                </Text>
              </View>
              <View style={[styles.turnoBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.turnoBadgeText, { color: colors.accent }]}>{horarioAlumno[0]?.grupo?.turno || 'Matutino'}</Text>
              </View>
            </View>
            <Text style={[styles.groupSpecialty, { color: colors.wine }]}>
              📚 {horarioAlumno[0]?.grupo?.especialidad || 'Cargando especialidad...'}
            </Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.primary }]}>Horario Escolar Semanal</Text>
            <Text style={[styles.sectionCounter, { color: colors.accent, backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
              {clasesDelDia.length} Materias
            </Text>
          </View>

          {/* Selector de Días */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelectorScroll}>
            {DIAS_SEMANA.map((dia) => {
              const active = diaSeleccionado === dia;
              return (
                <TouchableOpacity
                  key={dia}
                  onPress={() => setDiaSeleccionado(dia)}
                  style={[
                    styles.dayPill, 
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayPillText, { color: colors.textSecondary }, active && { color: '#ffffff' }]}>{dia}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.primary }]}>Cargando materias...</Text>
            </View>
          ) : clasesDelDia.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>☕</Text>
              <Text style={[styles.emptyTitle, { color: colors.primary }]}>Sin clases programadas</Text>
              <Text style={styles.emptySubtitle}>No tienes materias registradas para el {diaSeleccionado}.</Text>
            </View>
          ) : (
            clasesDelDia.map((item) => (
              <View key={item.id} style={[styles.scheduleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.scheduleAccentBar, { backgroundColor: colors.primary }]} />
                <View style={styles.scheduleBody}>
                  <View style={styles.scheduleTopRow}>
                    <Text style={[styles.subjectName, { color: colors.textPrimary }]}>{item.materia?.nombre}</Text>
                    {item.materia?.clave && (
                      <View style={[styles.codeTag, { backgroundColor: colors.wineLight }]}>
                        <Text style={[styles.codeTagText, { color: colors.wine }]}>{item.materia?.clave}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.scheduleDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>👨‍🏫</Text>
                      <Text style={styles.detailText}>
                        {limpiarTextoPHP(item.docente?.nombre)} {limpiarTextoPHP(item.docente?.apellido_paterno)}
                      </Text>
                    </View>
                    
                    <View style={styles.scheduleBottomRow}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>📍</Text>
                        <Text style={styles.detailText}>Aula: <Text style={[styles.detailHighlight, { color: colors.primary }]}>{item.aula || 'Por definir'}</Text></Text>
                      </View>

                      <View style={[styles.timeTag, { backgroundColor: colors.accentLight }]}>
                        <Text style={[styles.timeTagText, { color: colors.accent }]}>⏰ {item.horario || 'Por definir'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================
  // 4. VISTA: DOCENTE
  // ============================================================
  if (selectedCarga) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        {renderModalNormativo()}
        <View style={styles.appHeader}>
          <TouchableOpacity style={[styles.btnBack, { backgroundColor: colors.primaryLight }]} onPress={() => setSelectedCarga(null)}>
            <Text style={[styles.btnBackText, { color: colors.primary }]}>← Volver</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitleCenter, { color: colors.primary }]}>Pase de Lista</Text>
            <Text style={styles.headerSubCenter}>📅 {fecha}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.classInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.primary }]}>
            <View style={styles.classBadgeRow}>
              <View style={[styles.classTag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.classTagText, { color: colors.primary }]}>
                  Grupo {selectedCarga.grupo?.semestre}° "{selectedCarga.grupo?.grupo}"
                </Text>
              </View>
              <Text style={[styles.classTurnoText, { color: colors.accent }]}>{selectedCarga.grupo?.turno || 'Matutino'}</Text>
            </View>
            <Text style={[styles.classSubjectTitle, { color: colors.primary }]}>{selectedCarga.materia?.nombre}</Text>
            <Text style={styles.classMetaInfo}>
              📍 Aula: {selectedCarga.aula || 'Por asignar'} • ⏰ {selectedCarga.horario || 'Horario regular'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.primary }]}>Cargando lista de alumnos...</Text>
            </View>
          ) : (
            alumnosGrupo.map((alumno, index) => {
              const inicialesAlumno = `${(alumno.nombre || 'A')[0]}${(alumno.apellido_paterno || 'L')[0]}`.toUpperCase();
              const nombreAlumno = `${limpiarTextoPHP(alumno.nombre)} ${limpiarTextoPHP(alumno.apellido_paterno)}`;
              
              return (
                <View key={alumno.id} style={[styles.studentAttendanceCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.studentInfoRow}>
                    <View style={[styles.studentAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                      <Text style={[styles.studentAvatarText, { color: colors.primary }]}>{inicialesAlumno}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors.textPrimary }]}>{index + 1}. {nombreAlumno}</Text>
                      {alumno.nombre_tutor && (
                        <Text style={[styles.studentTutor, { color: colors.wine }]}>Tutor: {limpiarTextoPHP(alumno.nombre_tutor)}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.attendanceActionRow}>
                    {[
                      { key: 'Asistencia', label: 'A', activeColor: colors.primary },
                      { key: 'Falta', label: 'F', activeColor: colors.wine },
                      { key: 'Justificado', label: 'J', activeColor: colors.accent },
                      { key: 'Retardo', label: 'R', activeColor: '#3b82f6' },
                    ].map((estado) => {
                      const isActive = asistencias[alumno.id] === estado.key;
                      return (
                        <TouchableOpacity
                          key={estado.key}
                          onPress={() => setAsistencias({ ...asistencias, [alumno.id]: estado.key })}
                          style={[
                            styles.chipAttendance,
                            isActive && { backgroundColor: estado.activeColor, borderColor: estado.activeColor }
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipAttendanceText, isActive && styles.chipAttendanceTextActive]}>
                            {estado.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footerSubmitContainer}>
          <TouchableOpacity 
            style={[styles.btnSaveAttendance, { backgroundColor: colors.primary }, loading && styles.btnDisabled]} 
            onPress={handleGuardarAsistencia} 
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnSaveAttendanceText}>Guardar y Enviar Lista</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (vistaAsesoriaDocente) {
    return (
      <DocenteAsesoriaView
        docenteId={docenteInfo?.id}
        usuarioId={user?.id}
        onBack={() => setVistaAsesoriaDocente(false)}
      />
    );
  }

  const clasesRestantesCount = cargasDocente.length - clasesCompletadas.length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {renderModalNormativo()}
      {renderMenuLateral()}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.btnMenuDrawer} onPress={() => setMenuLateralVisible(true)}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerTitleCenter, { color: colors.primary }]}>Portal Docente</Text>
          <Text style={styles.headerSubCenter}>📅 {fecha}</Text>
        </View>
        <TouchableOpacity style={[styles.btnLogoutModern, { backgroundColor: colors.wineLight, borderColor: colors.wine }]} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={[styles.btnLogoutText, { color: colors.wine }]}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>Resumen del Día</Text>

        <View style={styles.metricsContainer}>
          <View style={[styles.metricCardSuccess, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <View style={styles.metricIconWrapSuccess}>
              <Text style={{ fontSize: 18, color: colors.primary }}>✓</Text>
            </View>
            <View>
              <Text style={[styles.metricNumberSuccess, { color: colors.primary }]}>{clasesCompletadas.length}</Text>
              <Text style={styles.metricLabelText}>Listas Tomadas</Text>
            </View>
          </View>

          <View style={[styles.metricCardWarning, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
            <View style={styles.metricIconWrapWarning}>
              <Text style={{ fontSize: 18, color: colors.accent }}>⏳</Text>
            </View>
            <View>
              <Text style={[styles.metricNumberWarning, { color: colors.accent }]}>{clasesRestantesCount}</Text>
              <Text style={styles.metricLabelText}>Clases Pendientes</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>Tus Clases Asignadas</Text>
          <Text style={[styles.sectionCounter, { color: colors.accent, backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
            {cargasDocente.length} Asignaciones
          </Text>
        </View>

        {cargasDocente.map((carga) => {
          const yaCompletada = clasesCompletadas.includes(carga.id);
          return (
            <TouchableOpacity 
              key={carga.id} 
              style={[
                styles.docenteCargaCard, 
                { backgroundColor: colors.cardBg, borderColor: colors.border },
                yaCompletada ? [styles.docenteCargaCardCompleted, { borderLeftColor: colors.primary }] : [styles.docenteCargaCardPending, { borderLeftColor: colors.accent }]
              ]} 
              onPress={() => handleSelectCarga(carga)}
              activeOpacity={yaCompletada ? 0.9 : 0.7}
            >
              <View style={styles.docenteCardHeader}>
                <View style={[styles.groupBadgeDocente, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.groupBadgeDocenteText, { color: colors.primary }]}>
                    Grupo {carga.grupo?.semestre}° "{carga.grupo?.grupo}"
                  </Text>
                </View>

                {yaCompletada ? (
                  <View style={[styles.badgeDone, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.badgeDoneText, { color: colors.primary }]}>✓ Completado</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePending, { backgroundColor: colors.accentLight }]}>
                    <Text style={[styles.badgePendingText, { color: colors.accent }]}>⚠️ Pasar Lista</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.docenteSubjectTitle, yaCompletada && { color: colors.textSecondary }]}>
                {carga.materia?.nombre}
              </Text>
              
              <View style={styles.docenteMetaRow}>
                <Text style={styles.docenteMetaText}>📍 Aula: {carga.aula || 'Por asignar'}</Text>
                <Text style={[styles.docenteTimeText, { color: colors.accent }, yaCompletada && { color: '#94a3b8' }]}>
                  ⏰ {carga.horario || 'Regular'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loginBackground: { flex: 1 },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.four,
  },
  modernCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: SPACING.five,
    paddingVertical: 32,
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.08)' }
      : {
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        }),
  },
  brandContainer: { alignItems: 'center', marginBottom: SPACING.five },
  logoBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.two,
    borderWidth: 2.5,
  },
  logoBadgeText: { fontSize: 34 },
  brandTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 1.5 },
  tagOrgullo: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  tagOrgulloText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  brandSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  formContainer: { width: '100%' },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: SPACING.four,
    height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  modernInput: { flex: 1, height: '100%', color: '#1e293b', fontSize: 15, fontWeight: '500' },
  btnLoginModern: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnLoginText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  loginFooter: {
    marginTop: SPACING.five,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: SPACING.three,
    alignItems: 'center',
  },
  footerNote: { fontSize: 11, fontWeight: '700' },

  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.four,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  btnMenuDrawer: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnLogoutModern: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  btnLogoutText: { fontSize: 12, fontWeight: '800' },
  btnBack: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnBackText: { fontWeight: '800', fontSize: 13 },
  headerTitleCenter: { fontSize: 16, fontWeight: '800' },
  headerSubCenter: { fontSize: 11, color: '#64748b' },

  scrollContent: {
    padding: SPACING.four,
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  sectionHeading: { fontSize: 17, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.four,
    marginBottom: SPACING.two,
  },
  sectionCounter: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },

  groupInfoCard: { padding: 16, borderRadius: 18, borderWidth: 1, marginTop: SPACING.three },
  groupHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  groupMetaLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.8 },
  groupTitle: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  turnoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  turnoBadgeText: { fontSize: 11, fontWeight: '800' },
  groupSpecialty: { fontSize: 13, fontWeight: '700', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

  daySelectorScroll: { flexDirection: 'row', marginBottom: SPACING.three },
  dayPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginRight: 8, borderWidth: 1.5 },
  dayPillText: { fontSize: 13, fontWeight: '700' },

  scheduleCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  scheduleAccentBar: { width: 6 },
  scheduleBody: { flex: 1, padding: 14 },
  scheduleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  subjectName: { fontSize: 15, fontWeight: '800', flex: 1 },
  codeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeTagText: { fontSize: 11, fontWeight: '800' },
  scheduleDetails: { marginTop: 8, gap: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  detailHighlight: { fontWeight: '700' },
  scheduleBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  timeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timeTagText: { fontSize: 11, fontWeight: '800' },

  metricsContainer: { flexDirection: 'row', gap: 12, marginTop: SPACING.two },
  metricCardSuccess: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, padding: 14, borderRadius: 16, gap: 10 },
  metricIconWrapSuccess: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  metricNumberSuccess: { fontSize: 20, fontWeight: '900' },
  metricCardWarning: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, padding: 14, borderRadius: 16, gap: 10 },
  metricIconWrapWarning: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  metricNumberWarning: { fontSize: 20, fontWeight: '900' },
  metricLabelText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  docenteCargaCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  docenteCargaCardPending: { borderLeftWidth: 5 },
  docenteCargaCardCompleted: { borderLeftWidth: 5, opacity: 0.75 },
  docenteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupBadgeDocente: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  groupBadgeDocenteText: { fontSize: 11, fontWeight: '800' },
  badgeDone: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeDoneText: { fontSize: 11, fontWeight: '800' },
  badgePending: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgePendingText: { fontSize: 11, fontWeight: '800' },
  docenteSubjectTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 10 },
  docenteMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  docenteMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  docenteTimeText: { fontSize: 12, fontWeight: '800' },

  classInfoCard: { borderRadius: 18, padding: 16, borderWidth: 1.5, marginBottom: SPACING.three },
  classBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  classTagText: { fontSize: 12, fontWeight: '800' },
  classTurnoText: { fontSize: 12, fontWeight: '700' },
  classSubjectTitle: { fontSize: 17, fontWeight: '900', marginTop: 8 },
  classMetaInfo: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '500' },

  studentAttendanceCard: { borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  studentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  studentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  studentAvatarText: { fontSize: 12, fontWeight: '800' },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentTutor: { fontSize: 11, marginTop: 1 },
  attendanceActionRow: { flexDirection: 'row', gap: 6 },
  chipAttendance: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  chipAttendanceText: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  chipAttendanceTextActive: { color: '#ffffff' },
  footerSubmitContainer: { padding: SPACING.four, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#edf2f7' },
  btnSaveAttendance: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnSaveAttendanceText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  emptyContainer: { padding: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySubtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  centerLoading: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: 13, marginTop: 10, fontWeight: '600' },

  // Estilos del Modal Normativo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.four,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    maxWidth: 380,
    width: '100%',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.25)' }
      : {
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        }),
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Estilos del Menú Lateral (Drawer)
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
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
    padding: 24,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
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
  },
  drawerUserRole: {
    color: '#e2f4ff',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  drawerBody: {
    flex: 1,
    paddingVertical: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  drawerItemIcon: {
    fontSize: 20,
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  drawerLogoutBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawerLogoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
});