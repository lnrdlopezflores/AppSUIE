import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubirPagos from '../components/SubirPagos';
import ProyectoTitulacionView from '../components/ProyectoTitulacion';

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

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vistaTitulacion, setVistaTitulacion] = useState(false);

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
  const [vistaPagos, setVistaPagos] = useState(false);

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
        } catch (e) {
          console.error("Error sincronizando estado diario:", e);
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

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Aviso', 'Por favor ingresa tu matrícula o clave de usuario.');
      return;
    }
    setLoading(true);
    try {
      const resUsers = await fetch(`${API_BASE_URL}/usuarios`);
      if (!resUsers.ok) throw new Error('Error al conectar con el servidor.');
      const usuarios = await resUsers.json();
      const foundUser = usuarios.find((u: any) => u.username === username.trim() && u.activo);

      if (!foundUser) throw new Error('Credenciales no válidas o usuario inactivo.');

      if (foundUser.rol === 'Docente') {
        const resDocentes = await fetch(`${API_BASE_URL}/docentes`);
        if (!resDocentes.ok) throw new Error(`Error en el servidor (${resDocentes.status}).`);

        const docentes = await resDocentes.json();
        const listaDocentes = Array.isArray(docentes) ? docentes : docentes.data || [];
        const foundDocente = listaDocentes.find((d: any) => d.usuario_id === foundUser.id);
        
        if (!foundDocente) throw new Error('No se encontraron detalles del docente.');
        
        setUser(foundUser);
        setDocenteInfo(foundDocente);

      } else if (foundUser.rol === 'Estudiante') {
        const resAlumnos = await fetch(`${API_BASE_URL}/alumnos`);
        if (!resAlumnos.ok) throw new Error(`Error en el servidor (${resAlumnos.status}).`);
        
        const alumnos = await resAlumnos.json();
        const listaAlumnos = Array.isArray(alumnos) ? alumnos : alumnos.data || [];
        const foundAlumno = listaAlumnos.find((a: any) => a.usuario_id === foundUser.id);
        
        if (!foundAlumno) throw new Error('No se encontraron detalles del alumno.');
        
        setUser(foundUser);
        setAlumnoInfo(foundAlumno);
      } else {
        throw new Error('Rol no admitido en esta aplicación.');
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
      console.error("Error en cargas:", error); 
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
      console.error("Error en horario:", error);
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
  };

  // --- VISTA: LOGIN  ---
  if (!user) {
    return (
      <SafeAreaView style={styles.loginBackground}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginContainer}
        >
          <View style={styles.modernCard}>
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>🏛️</Text>
              </View>
              <Text style={styles.brandTitle}>SUIE</Text>
              <View style={styles.tagOrgullo}>
                <Text style={styles.tagOrgulloText}>#OrgullosamenteCECyTE13</Text>
              </View>
              <Text style={styles.brandSubtitle}>
                Sistema Unificado de Integración Educativa
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Identificación Institucional</Text>
              <View style={[styles.inputWrapper, inputFocused && styles.inputWrapperFocused]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Matrícula o Clave de Acceso"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
              </View>

              <TouchableOpacity 
                style={[styles.btnLoginModern, loading && styles.btnDisabled]} 
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
              <Text style={styles.footerNote}>CECyTE • EMSAD Educación de Calidad</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- PORTAL ESTUDIANTE ---
  if (user.rol === 'Estudiante') {
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
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const diaBuscadoSinAcento = diaActual.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

    const nombreLimpio = `${limpiarTextoPHP(alumnoInfo?.nombre)} ${limpiarTextoPHP(alumnoInfo?.apellido_paterno)}`;
    const iniciales = `${(alumnoInfo?.nombre || 'E')[0]}${(alumnoInfo?.apellido_paterno || 'S')[0]}`.toUpperCase();

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appHeader}>
          <View style={styles.userInfoBlock}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{iniciales}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{nombreLimpio}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>🎓 Alumno CECyTE</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.btnLogoutModern} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.btnLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Banner Financiero con Acento Naranja */}
          <TouchableOpacity 
            style={styles.financeBanner}
            onPress={() => setVistaPagos(true)}
            activeOpacity={0.9}
          >
            <View style={styles.financeIconWrapper}>
              <Text style={{ fontSize: 24 }}>💳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.financeBannerTitle}>Control Financiero y Pagos</Text>
              <Text style={styles.financeBannerSub}>Consulta tus órdenes y sube tus comprobantes</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.financeBanner, { backgroundColor: '#841B44', borderColor: '#651333', marginTop: SPACING.two }]}
            onPress={() => setVistaTitulacion(true)}
            activeOpacity={0.9}
          >
            <View style={styles.financeIconWrapper}>
              <Text style={{ fontSize: 24 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.financeBannerTitle}>Proyecto de Titulación</Text>
              <Text style={styles.financeBannerSub}>Consulta estatus o registra tu proyecto</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Text style={[styles.arrowText, { color: '#841B44' }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Tarjeta de Especialidad */}
          <View style={styles.groupInfoCard}>
            <View style={styles.groupHeaderRow}>
              <View>
                <Text style={styles.groupMetaLabel}>GRUPO ASIGNADO</Text>
                <Text style={styles.groupTitle}>
                  {horarioAlumno[0]?.grupo?.semestre ? `${horarioAlumno[0]?.grupo?.semestre}° "${horarioAlumno[0]?.grupo?.grupo}"` : 'Grupo Asignado'}
                </Text>
              </View>
              <View style={styles.turnoBadge}>
                <Text style={styles.turnoBadgeText}>{horarioAlumno[0]?.grupo?.turno || 'Matutino'}</Text>
              </View>
            </View>
            <Text style={styles.groupSpecialty}>
              🌿 {horarioAlumno[0]?.grupo?.especialidad || 'Cargando especialidad...'}
            </Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Horario Escolar Semanal</Text>
            <Text style={styles.sectionCounter}>{clasesDelDia.length} Materias</Text>
          </View>

          {/* Selector de Días */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelectorScroll}>
            {DIAS_SEMANA.map((dia) => {
              const active = diaSeleccionado === dia;
              return (
                <TouchableOpacity
                  key={dia}
                  onPress={() => setDiaSeleccionado(dia)}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{dia}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Listado de Asignaturas */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0F7F41" />
              <Text style={styles.loadingText}>Cargando materias...</Text>
            </View>
          ) : clasesDelDia.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>☕</Text>
              <Text style={styles.emptyTitle}>Sin clases programadas</Text>
              <Text style={styles.emptySubtitle}>No tienes materias registradas para el {diaSeleccionado}.</Text>
            </View>
          ) : (
            clasesDelDia.map((item) => (
              <View key={item.id} style={styles.scheduleCard}>
                <View style={styles.scheduleAccentBar} />
                <View style={styles.scheduleBody}>
                  <View style={styles.scheduleTopRow}>
                    <Text style={styles.subjectName}>{item.materia?.nombre}</Text>
                    {item.materia?.clave && (
                      <View style={styles.codeTag}>
                        <Text style={styles.codeTagText}>{item.materia?.clave}</Text>
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
                        <Text style={styles.detailText}>Aula: <Text style={styles.detailHighlight}>{item.aula || 'Por definir'}</Text></Text>
                      </View>

                      <View style={styles.timeTag}>
                        <Text style={styles.timeTagText}>⏰ {item.horario || 'Por definir'}</Text>
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

  // --- PORTAL DOCENTE: FORMULARIO DE ASISTENCIA ---
  if (selectedCarga) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appHeader}>
          <TouchableOpacity style={styles.btnBack} onPress={() => setSelectedCarga(null)}>
            <Text style={styles.btnBackText}>← Volver</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitleCenter}>Pase de Lista</Text>
            <Text style={styles.headerSubCenter}>📅 {fecha}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.classInfoCard}>
            <View style={styles.classBadgeRow}>
              <View style={styles.classTag}>
                <Text style={styles.classTagText}>
                  Grupo {selectedCarga.grupo?.semestre}° "{selectedCarga.grupo?.grupo}"
                </Text>
              </View>
              <Text style={styles.classTurnoText}>{selectedCarga.grupo?.turno || 'Matutino'}</Text>
            </View>
            <Text style={styles.classSubjectTitle}>{selectedCarga.materia?.nombre}</Text>
            <Text style={styles.classMetaInfo}>
              📍 Aula: {selectedCarga.aula || 'Por asignar'} • ⏰ {selectedCarga.horario || 'Horario regular'}
            </Text>
          </View>

          {/* Leyenda de Asistencia */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0F7F41' }]} />
              <Text style={styles.legendLabel}>Asistencia</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#841B44' }]} />
              <Text style={styles.legendLabel}>Falta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E66711' }]} />
              <Text style={styles.legendLabel}>Justif.</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendLabel}>Retardo</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0F7F41" />
              <Text style={styles.loadingText}>Cargando lista de alumnos...</Text>
            </View>
          ) : (
            alumnosGrupo.map((alumno, index) => {
              const inicialesAlumno = `${(alumno.nombre || 'A')[0]}${(alumno.apellido_paterno || 'L')[0]}`.toUpperCase();
              const nombreAlumno = `${limpiarTextoPHP(alumno.nombre)} ${limpiarTextoPHP(alumno.apellido_paterno)}`;
              
              return (
                <View key={alumno.id} style={styles.studentAttendanceCard}>
                  <View style={styles.studentInfoRow}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{inicialesAlumno}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{index + 1}. {nombreAlumno}</Text>
                      {alumno.nombre_tutor && (
                        <Text style={styles.studentTutor}>Tutor: {limpiarTextoPHP(alumno.nombre_tutor)}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.attendanceActionRow}>
                    {[
                      { key: 'Asistencia', label: 'A', activeColor: '#0F7F41' },
                      { key: 'Falta', label: 'F', activeColor: '#841B44' },
                      { key: 'Justificado', label: 'J', activeColor: '#E66711' },
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
            style={[styles.btnSaveAttendance, loading && styles.btnDisabled]} 
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

  // --- PORTAL DOCENTE: DASHBOARD ---
  const clasesRestantesCount = cargasDocente.length - clasesCompletadas.length;
  const docenteNombre = docenteInfo?.nombre ? limpiarTextoPHP(docenteInfo.nombre) : 'Docente';
  const docenteInicial = (docenteNombre || 'D')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <View style={styles.userInfoBlock}>
          <View style={[styles.avatarCircle, { backgroundColor: '#E7F3EC' }]}>
            <Text style={[styles.avatarText, { color: '#0F7F41' }]}>{docenteInicial}</Text>
          </View>
          <View>
            <Text style={styles.userName}>Prof. {docenteNombre}</Text>
            <Text style={styles.userSubtitle}>📅 {fecha}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnLogoutModern} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.btnLogoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeading}>Resumen del Día</Text>

        <View style={styles.metricsContainer}>
          <View style={styles.metricCardSuccess}>
            <View style={styles.metricIconWrapSuccess}>
              <Text style={{ fontSize: 18, color: '#0F7F41' }}>✓</Text>
            </View>
            <View>
              <Text style={styles.metricNumberSuccess}>{clasesCompletadas.length}</Text>
              <Text style={styles.metricLabelText}>Listas Tomadas</Text>
            </View>
          </View>

          <View style={styles.metricCardWarning}>
            <View style={styles.metricIconWrapWarning}>
              <Text style={{ fontSize: 18, color: '#E66711' }}>⏳</Text>
            </View>
            <View>
              <Text style={styles.metricNumberWarning}>{clasesRestantesCount}</Text>
              <Text style={styles.metricLabelText}>Clases Pendientes</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Tus Clases Asignadas</Text>
          <Text style={styles.sectionCounter}>{cargasDocente.length} Asignaciones</Text>
        </View>

        {cargasDocente.map((carga) => {
          const yaCompletada = clasesCompletadas.includes(carga.id);
          return (
            <TouchableOpacity 
              key={carga.id} 
              style={[
                styles.docenteCargaCard, 
                yaCompletada ? styles.docenteCargaCardCompleted : styles.docenteCargaCardPending
              ]} 
              onPress={() => handleSelectCarga(carga)}
              activeOpacity={yaCompletada ? 0.9 : 0.7}
            >
              <View style={styles.docenteCardHeader}>
                <View style={styles.groupBadgeDocente}>
                  <Text style={styles.groupBadgeDocenteText}>
                    Grupo {carga.grupo?.semestre}° "{carga.grupo?.grupo}"
                  </Text>
                </View>

                {yaCompletada ? (
                  <View style={styles.badgeDone}>
                    <Text style={styles.badgeDoneText}>✓ Completado</Text>
                  </View>
                ) : (
                  <View style={styles.badgePending}>
                    <Text style={styles.badgePendingText}>⚠️ Pasar Lista</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.docenteSubjectTitle, yaCompletada && { color: '#64748b' }]}>
                {carga.materia?.nombre}
              </Text>
              
              <View style={styles.docenteMetaRow}>
                <Text style={styles.docenteMetaText}>📍 Aula: {carga.aula || 'Por asignar'}</Text>
                <Text style={[styles.docenteTimeText, yaCompletada && { color: '#94a3b8' }]}>
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

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  
  // ==========================================
  // ESTILOS DE AUTENTICACIÓN (LOGIN)
  // ==========================================
  loginBackground: {
    flex: 1,
    backgroundColor: '#E7F3EC', // Tinte suave Verde Bandera
  },
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
    borderColor: '#0F7F41', // Borde Verde Bandera
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 25px rgba(15, 127, 65, 0.12)' }
      : {
          elevation: 6,
          shadowColor: '#0F7F41',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        }),
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.five,
  },
  logoBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E7F3EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.two,
    borderWidth: 2.5,
    borderColor: '#0F7F41',
  },
  logoBadgeText: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F7F41', // Verde Bandera
    letterSpacing: 1.5,
  },
  tagOrgullo: {
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E66711',
  },
  tagOrgulloText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E66711', // Naranja Institucional
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
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
  inputWrapperFocused: {
    borderColor: '#0F7F41',
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  modernInput: {
    flex: 1,
    height: '100%',
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '500',
  },
  btnLoginModern: {
    height: 52,
    backgroundColor: '#0F7F41', // Verde Bandera
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(15, 127, 65, 0.3)' }
      : {
          elevation: 3,
          shadowColor: '#0F7F41',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }),
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnLoginText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginFooter: {
    marginTop: SPACING.five,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: SPACING.three,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    color: '#841B44', // Vino Institucional
    fontWeight: '700',
  },

  // ==========================================
  // CABECERAS Y NAVEGACIÓN GLOBAL
  // ==========================================
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
  userInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E7F3EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F7F41',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F7F41',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a202c',
  },
  userSubtitle: {
    fontSize: 12,
    color: '#0F7F41',
    fontWeight: '600',
  },
  roleTag: {
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E66711',
  },
  btnLogoutModern: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F5E8ED',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#841B44',
  },
  btnLogoutText: {
    color: '#841B44', // Vino
    fontSize: 12,
    fontWeight: '800',
  },
  btnBack: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E7F3EC',
  },
  btnBackText: {
    color: '#0F7F41',
    fontWeight: '800',
    fontSize: 13,
  },
  headerTitleCenter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F7F41',
  },
  headerSubCenter: {
    fontSize: 11,
    color: '#64748b',
  },

  // ==========================================
  // CONTENEDORES Y SCROLL
  // ==========================================
  scrollContent: {
    padding: SPACING.four,
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F7F41',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.four,
    marginBottom: SPACING.two,
  },
  sectionCounter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E66711',
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E66711',
  },

  // ==========================================
  // VISTA ESTUDIANTE: CARDS & HORARIOS
  // ==========================================
  financeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E66711', // Naranja Institucional
    padding: 16,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#c55309',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(230, 103, 17, 0.25)' }
      : {
          elevation: 4,
          shadowColor: '#E66711',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        }),
  },
  financeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  financeBannerSub: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 12,
    marginTop: 2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#E66711',
    fontSize: 16,
    fontWeight: '900',
  },
  groupInfoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: SPACING.three,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F7F41',
    marginTop: 2,
  },
  turnoBadge: {
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  turnoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E66711',
  },
  groupSpecialty: {
    fontSize: 13,
    fontWeight: '700',
    color: '#841B44',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  // Selector de Días
  daySelectorScroll: {
    flexDirection: 'row',
    marginBottom: SPACING.three,
  },
  dayPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  dayPillActive: {
    backgroundColor: '#0F7F41', // Verde Bandera Activo
    borderColor: '#0F7F41',
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  dayPillTextActive: {
    color: '#ffffff',
  },

  // Tarjetas de Horario
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  scheduleAccentBar: {
    width: 6,
    backgroundColor: '#0F7F41', // Verde
  },
  scheduleBody: {
    flex: 1,
    padding: 14,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  codeTag: {
    backgroundColor: '#F5E8ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#841B44', // Clave en Guinda
  },
  scheduleDetails: {
    marginTop: 8,
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 13,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  detailHighlight: {
    color: '#0F7F41',
    fontWeight: '700',
  },
  scheduleBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  timeTag: {
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E66711', // Horario en Naranja
  },

  // ==========================================
  // VISTA DOCENTE: DASHBOARD & PASE DE LISTA
  // ==========================================
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.two,
  },
  metricCardSuccess: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F3EC',
    borderWidth: 1.5,
    borderColor: '#0F7F41',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  metricIconWrapSuccess: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricNumberSuccess: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F7F41',
  },
  metricCardWarning: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEEE4',
    borderWidth: 1.5,
    borderColor: '#E66711',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  metricIconWrapWarning: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricNumberWarning: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E66711',
  },
  metricLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  docenteCargaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  docenteCargaCardPending: {
    borderLeftWidth: 5,
    borderLeftColor: '#E66711',
  },
  docenteCargaCardCompleted: {
    borderLeftWidth: 5,
    borderLeftColor: '#0F7F41',
    opacity: 0.75,
  },
  docenteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupBadgeDocente: {
    backgroundColor: '#E7F3EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  groupBadgeDocenteText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F7F41',
  },
  badgeDone: {
    backgroundColor: '#E7F3EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDoneText: {
    color: '#0F7F41',
    fontSize: 11,
    fontWeight: '800',
  },
  badgePending: {
    backgroundColor: '#FDEEE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePendingText: {
    color: '#E66711',
    fontSize: 11,
    fontWeight: '800',
  },
  docenteSubjectTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 10,
  },
  docenteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  docenteMetaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  docenteTimeText: {
    fontSize: 12,
    color: '#E66711',
    fontWeight: '800',
  },

  // Vista Pase de Lista
  classInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#0F7F41',
    marginBottom: SPACING.three,
  },
  classBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classTag: {
    backgroundColor: '#E7F3EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  classTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F7F41',
  },
  classTurnoText: {
    fontSize: 12,
    color: '#E66711',
    fontWeight: '700',
  },
  classSubjectTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F7F41',
    marginTop: 8,
  },
  classMetaInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  studentAttendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E7F3EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0F7F41',
  },
  studentAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F7F41',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  studentTutor: {
    fontSize: 11,
    color: '#841B44',
    marginTop: 1,
  },
  attendanceActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipAttendance: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  chipAttendanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  chipAttendanceTextActive: {
    color: '#ffffff',
  },
  footerSubmitContainer: {
    padding: SPACING.four,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  btnSaveAttendance: {
    height: 52,
    backgroundColor: '#0F7F41', // Verde
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 14px rgba(15, 127, 65, 0.35)' }
      : {
          elevation: 4,
          shadowColor: '#0F7F41',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        }),
  },
  btnSaveAttendanceText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  emptyContainer: {
    padding: 36,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F7F41',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#0F7F41',
    marginTop: 10,
    fontWeight: '600',
  },
});