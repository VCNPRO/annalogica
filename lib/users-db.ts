// Base de datos simulada para usuarios
// En producción, reemplazar por PostgreSQL, MySQL, etc.

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

// Almacenamiento en memoria (se reinicia con cada deploy)
const users: User[] = [];

export const UserDB = {
  // Crear nuevo usuario
  create: (user: User): User => {
    users.push(user);
    return user;
  },

  // Buscar usuario por email
  findByEmail: (email: string): User | undefined => {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  },

  // Buscar usuario por ID
  findById: (id: string): User | undefined => {
    return users.find(user => user.id === id);
  },

  // Obtener todos los usuarios (para debug)
  getAll: (): User[] => {
    return users;
  },

  // Eliminar usuario
  delete: (id: string): boolean => {
    const index = users.findIndex(user => user.id === id);
    if (index !== -1) {
      users.splice(index, 1);
      return true;
    }
    return false;
  },

  // Actualizar usuario
  update: (id: string, updates: Partial<Omit<User, 'id'>>): User | undefined => {
    const user = users.find(user => user.id === id);
    if (user) {
      Object.assign(user, updates);
      return user;
    }
    return undefined;
  }
};