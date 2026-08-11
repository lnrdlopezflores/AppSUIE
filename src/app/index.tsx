import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import SubirPagos from '../components/SubirPagos';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const SPACING = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
};

// Función para obtener la fecha de hoy en la zona horaria local (Formato: YYYY-MM-DD)
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
  const [loading, setLoading] = useState(false);

  const [docenteInfo, setDocenteInfo] = useState<any>(null);
  const [cargasDocente, setCargasDocente] = useState<any[]>([]);
  const [selectedCarga, setSelectedCarga] = useState<any>(null);
  const [alumnosGrupo, setAlumnosGrupo] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<{ [key: number]: string }>({});
  const [observaciones, setObservaciones] = useState<{ [key: number]: string }>({});
  const [clasesCompletadas, setClasesCompletadas] = useState<number[]>([]);
  
  const [alumnoInfo, setAlumnoInfo] = useState<any>(null);
  const [horarioAlumno, setHorarioAlumno] = useState<any[]>([]);

  // Fecha calculada dinámicamente con la zona horaria local
  const [fecha] = useState(getFechaLocalActual());
  const [vistaPagos, setVistaPagos] = useState(false);

  // --- MONITOREO DE ASISTENCIAS REGISTRADAS HOY ---
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

          // Consultar registros en la BD para la fecha local
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
      Alert.alert('Error', 'Por favor ingresa tu usuario.');
      return;
    }
    setLoading(true);
    try {
      const resUsers = await fetch(`${API_BASE_URL}/usuarios`);
      if (!resUsers.ok) throw new Error('Error al conectar con el servidor.');
      const usuarios = await resUsers.json();
      const foundUser = usuarios.find((u: any) => u.username === username.trim() && u.activo);

      if (!foundUser) {
        throw new Error('Usuario no válido o inactivo.');
      }

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
        throw new Error('Rol no soportado.');
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
    
    // Guardar usando la llave indexada por fecha local
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
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loginCard}>
          <Text style={[styles.textCenter, styles.titleText]}>SUIE Móvil</Text>
          <Text style={[styles.textCenter, { color: '#666', marginBottom: SPACING.four, fontSize: 14 }]}>
            Portal Educativo
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Matrícula o Control"
            placeholderTextColor="#888"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ingresar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (user.rol === 'Estudiante') {
    if (vistaPagos) {
      return <SubirPagos alumnoId={alumnoInfo?.id} onBack={() => setVistaPagos(false)} />;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 17, color: '#1a202c' }}>
              {limpiarTextoPHP(alumnoInfo?.nombre)} {limpiarTextoPHP(alumnoInfo?.apellido_paterno)}
            </Text>
            <Text style={{ fontSize: 12, color: '#4a5568' }}>Portal del Estudiante</Text>
          </View>
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: 'bold' }}>Salir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={[styles.infoBanner, { backgroundColor: '#00a6ed', borderColor: '#0084bd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            onPress={() => setVistaPagos(true)}
          >
            <View>
              <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#fff' }}>💳 Estado Financiero y Pagos</Text>
              <Text style={{ fontSize: 12, color: '#e2f4ff', marginTop: 2 }}>Revisa tus deudas y comprobantes</Text>
            </View>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>→</Text>
          </TouchableOpacity>

          <View style={[styles.infoBanner, { marginTop: SPACING.two }]}>
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#2d3748' }}>Tu Grupo Asignado</Text>
            <Text style={{ fontSize: 13, color: '#4a5568', marginTop: 2 }}>
              Especialidad: {horarioAlumno[0]?.grupo?.especialidad || 'Cargando...'}
            </Text>
          </View>

          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a202c', marginTop: SPACING.two, marginBottom: SPACING.one }}>
            Horario Semanal
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#00a6ed" style={{ marginTop: SPACING.four }} />
          ) : (
            horarioAlumno.map((item) => (
              <View key={item.id} style={styles.cargaCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: '#2d3748', flex: 1 }}>
                    {item.materia?.nombre}
                  </Text>
                  <View style={[styles.tagGrupo, { backgroundColor: '#e2f4ff' }]}>
                    <Text style={[styles.tagTexto, { color: '#0070a3' }]}>{item.materia?.clave}</Text>
                  </View>
                </View>
                
                <Text style={{ fontSize: 13, color: '#4a5568', marginTop: SPACING.one, fontWeight: '500' }}>
                  👨‍🏫 Docente: {limpiarTextoPHP(item.docente?.nombre)} {limpiarTextoPHP(item.docente?.apellido_paterno)}
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.two, paddingTop: 2, borderTopWidth: 1, borderTopColor: '#f7fafc' }}>
                  <Text style={{ fontSize: 13, color: '#718096' }}>📍 Aula: {item.aula || 'Por definir'}</Text>
                  <Text style={{ fontSize: 13, color: '#00a6ed', fontWeight: 'bold' }}>⏰ {item.horario}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- PORTAL DOCENTE: FORMULARIO DE PASE DE LISTA ---
  if (selectedCarga) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCarga(null)}>
            <Text style={{ color: '#00a6ed', fontWeight: 'bold' }}>← Volver</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a202c' }}>Pase de Lista</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBanner}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#2d3748' }}>{selectedCarga.materia?.nombre}</Text>
            <Text style={{ fontSize: 13, color: '#4a5568', marginTop: 2 }}>
              Grupo: {selectedCarga.grupo?.semestre}°"{selectedCarga.grupo?.grupo}" - {selectedCarga.grupo?.especialidad}
            </Text>
            <Text style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Fecha de hoy: {fecha}</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#00a6ed" style={{ marginTop: SPACING.four }} />
          ) : (
            alumnosGrupo.map((alumno) => (
              <View key={alumno.id} style={styles.alumnoCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: '#1a202c' }}>
                    {limpiarTextoPHP(alumno.nombre)} {limpiarTextoPHP(alumno.apellido_paterno)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Tutor: {alumno.nombre_tutor}</Text>
                </View>
                <View style={styles.asistenciaRow}>
                  {['Asistencia', 'Falta', 'Justificado', 'Retardo'].map((estado) => {
                    const active = asistencias[alumno.id] === estado;
                    return (
                      <TouchableOpacity
                        key={estado}
                        onPress={() => setAsistencias({ ...asistencias, [alumno.id]: estado })}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{estado[0]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={styles.btnSave} onPress={handleGuardarAsistencia} disabled={loading}>
          <Text style={styles.btnText}>Enviar Reporte Diario</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- PORTAL DOCENTE: DASHBOARD Y MONITOR DE PENDIENTES ---
  const clasesRestantesCount = cargasDocente.length - clasesCompletadas.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 17, color: '#1a202c' }}>Prof. {docenteInfo?.nombre}</Text>
          <Text style={{ fontSize: 12, color: '#00a6ed', fontWeight: '500' }}>📅 Fecha Local: {fecha}</Text>
        </View>
        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: 'bold' }}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a202c', marginBottom: SPACING.two }}>Estado de Asistencias Hoy</Text>
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, { backgroundColor: '#e2f4ff', borderColor: '#bce4ff' }]}>
            <Text style={[styles.metricNumber, { color: '#0070a3' }]}>{clasesCompletadas.length}</Text>
            <Text style={styles.metricLabel}>Listas Pasadas</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#fff3cd', borderColor: '#ffeeba' }]}>
            <Text style={[styles.metricNumber, { color: '#856404' }]}>{clasesRestantesCount}</Text>
            <Text style={styles.metricLabel}>Pendientes Hoy</Text>
          </View>
        </View>

        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a202c', marginTop: SPACING.three, marginBottom: SPACING.two }}>
          Tus Clases Asignadas
        </Text>

        {cargasDocente.map((carga) => {
          const yaCompletada = clasesCompletadas.includes(carga.id);
          return (
            <TouchableOpacity 
              key={carga.id} 
              style={[
                styles.cargaCard, 
                yaCompletada ? styles.cargaCardDisabled : styles.cargaCardPending
              ]} 
              onPress={() => handleSelectCarga(carga)}
              activeOpacity={yaCompletada ? 1 : 0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.tagGrupo}>
                  <Text style={styles.tagTexto}>Grupo {carga.grupo?.semestre}°"{carga.grupo?.grupo}"</Text>
                </View>
                
                {/* Indicadores dinámicos de estado */}
                {yaCompletada ? (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>✓ Asistencia Tomada</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>⚠️ Falta Pasar Lista</Text>
                  </View>
                )}
              </View>

              <Text style={[{ fontWeight: '600', fontSize: 16, marginTop: SPACING.two, color: '#2d3748' }, yaCompletada && { color: '#a0aec0' }]}>
                {carga.materia?.nombre}
              </Text>
              <Text style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>📍 Aula: {carga.aula || 'Por asignar'}</Text>
              <Text style={[{ fontSize: 13, color: '#00a6ed', marginTop: 4, fontWeight: '500' }, yaCompletada && { color: '#a0aec0' }]}>
                ⏰ {carga.horario}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, alignItems: 'center', padding: SPACING.five, backgroundColor: '#f8f9fa', justifyContent: 'center' },
  loginCard: { width: '100%', maxWidth: 340, padding: SPACING.five, borderRadius: SPACING.four, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef' },
  titleText: { fontSize: 26, fontWeight: 'bold', color: '#1a202c', marginBottom: 2 },
  textCenter: { textAlign: 'center' },
  input: { height: 48, borderColor: '#dee2e6', borderWidth: 1, borderRadius: SPACING.two, paddingHorizontal: SPACING.three, marginBottom: SPACING.four, color: '#000', backgroundColor: '#fdfdfd' },
  btnPrimary: { height: 48, backgroundColor: '#00a6ed', borderRadius: SPACING.two, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.four, paddingVertical: SPACING.three, borderBottomWidth: 1, borderBottomColor: '#edf2f7', backgroundColor: '#fff' },
  btnLogout: { paddingHorizontal: SPACING.three, paddingVertical: SPACING.one, backgroundColor: '#ffe5e5', borderRadius: SPACING.two },
  scrollContent: { padding: SPACING.four, gap: SPACING.three, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' },
  metricsContainer: { flexDirection: 'row', gap: SPACING.three, width: '100%' },
  metricCard: { flex: 1, padding: SPACING.three, borderRadius: SPACING.three, borderWidth: 1, alignItems: 'center' },
  metricNumber: { fontSize: 22, fontWeight: 'bold' },
  metricLabel: { fontSize: 12, color: '#4a5568', marginTop: 2 },
  cargaCard: { backgroundColor: '#fff', padding: SPACING.four, borderRadius: SPACING.three, borderWidth: 1, borderColor: '#edf2f7', marginBottom: 4 },
  cargaCardPending: { borderLeftWidth: 4, borderLeftColor: '#f6ad55' },
  cargaCardDisabled: { opacity: 0.6, backgroundColor: '#edf2f7', borderColor: '#cbd5e0' },
  tagGrupo: { alignSelf: 'flex-start', backgroundColor: '#cae2e6', paddingHorizontal: SPACING.three, paddingVertical: 4, borderRadius: 50 },
  tagTexto: { fontSize: 11, fontWeight: 'bold', color: '#2d3748' },
  completedBadge: { backgroundColor: '#c6f6d5', paddingHorizontal: SPACING.two, paddingVertical: 2, borderRadius: 4 },
  completedBadgeText: { color: '#22543d', fontSize: 11, fontWeight: 'bold' },
  pendingBadge: { backgroundColor: '#feebc8', paddingHorizontal: SPACING.two, paddingVertical: 2, borderRadius: 4 },
  pendingBadgeText: { color: '#744210', fontSize: 11, fontWeight: 'bold' },
  infoBanner: { backgroundColor: '#cae2e6', padding: SPACING.four, borderRadius: SPACING.three, borderWidth: 1, borderColor: '#b2d7dc' },
  alumnoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.three, borderRadius: SPACING.three, borderWidth: 1, borderColor: '#edf2f7', gap: SPACING.two },
  asistenciaRow: { flexDirection: 'row', gap: 6 },
  chip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#cbd5e0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#00a6ed', borderColor: '#00a6ed' },
  chipText: { fontSize: 12, fontWeight: 'bold', color: '#4a5568' },
  chipTextActive: { color: '#fff' },
  btnSave: { margin: SPACING.four, height: 52, backgroundColor: '#00a6ed', borderRadius: SPACING.three, justifyContent: 'center', alignItems: 'center' },
});