import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function DashboardDocente({ onSelectCarga }) {
  const { docenteInfo, logout } = useContext(AuthContext);
  const [cargas, setCargas] = useState([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/carga-academica')
      .then(res => res.json())
      .then(data => {
        // Filtrar únicamente las cargas académicas que pertenezcan a este docente
        const filtradas = data.filter(c => c.docente_id === docenteInfo.id);
        setCargas(filtradas);
      })
      .catch(err => console.error("Error cargando carga académica:", err));
  }, [docenteInfo.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Panel de Control</h1>
          <p className="text-sm text-gray-500">Bienvenido(a), {docenteInfo.nombre} {docenteInfo.apellido_paterno}</p>
        </div>
        <button onClick={logout} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Tus Clases Asignadas</h2>
        
        {cargas.length === 0 ? (
          <div className="p-8 bg-white rounded-xl shadow-sm text-center text-gray-500 border border-gray-100">
            No tienes cargas académicas asignadas para este ciclo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargas.map((carga) => (
              <div 
                key={carga.id} 
                onClick={() => onSelectCarga(carga)}
                className="cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-5 transition-all hover:-translate-y-1 group"
              >
                <div className="inline-block px-3 py-1 bg-[#cae2e6] text-gray-800 text-xs font-bold rounded-full mb-3">
                  Grupo: {carga.grupo?.semestre}°"{carga.grupo?.grupo}" - {carga.grupo?.especialidad}
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-[#00a6ed] transition-colors">
                  {carga.materia?.nombre}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Clave Materia: {carga.materia?.clave}</p>
                
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-600">
                  <span>📍 {carga.aula || 'Sin aula asignada'}</span>
                  <span className="text-xs font-medium text-gray-500">📅 {carga.horario || 'Horario no definido'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}