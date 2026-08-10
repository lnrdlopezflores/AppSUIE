import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [docenteInfo, setDocenteInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('suie_user');
    const storedDocente = localStorage.getItem('suie_docente');
    if (storedUser && storedDocente) {
      setUser(JSON.parse(storedUser));
      setDocenteInfo(JSON.parse(storedDocente));
    }
    setLoading(false);
  } , []);

  const login = async (username, password) => {
    try {
      // 1. Validar el usuario contra el endpoint de usuarios
      const resUsers = await fetch('http://127.0.0.1:8000/api/usuarios');
      const usuarios = await resUsers.json();
      
      const foundUser = usuarios.find(u => u.username === username && u.activo);
      
      // Nota: En producción validarías el password con hash en el servidor, aquí hacemos match directo o simulación.
      if (!foundUser || foundUser.rol !== 'Docente') {
        throw new Error('Usuario no encontrado o no tiene rol de Docente.');
      }

      // 2. Obtener los detalles del docente asociado
      const resDocentes = await fetch('http://127.0.0.1:8000/api/docentes');
      const docentes = await resDocentes.json();
      const foundDocente = docentes.find(d => d.usuario_id === foundUser.id);

      if (!foundDocente) {
        throw new Error('No se encontraron datos de docente para este usuario.');
      }

      setUser(foundUser);
      setDocenteInfo(foundDocente);
      localStorage.setItem('suie_user', JSON.stringify(foundUser));
      localStorage.setItem('suie_docente', JSON.stringify(foundDocente));
      return true;
    } catch (error) {
      alert(error.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setDocenteInfo(null);
    localStorage.removeItem('suie_user');
    localStorage.removeItem('suie_docente');
  };

  return (
    <AuthContext.Provider value={{ user, docenteInfo, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};