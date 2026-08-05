import { database } from '../../../shared/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  is_organizer: boolean;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  username: string;
  full_name: string;
}

export interface UpdateUserInput {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
}

export const identityService = {
  async createUser(input: CreateUserInput): Promise<User> {
    const { email, password, username, full_name } = input;
    
    // Check if user exists
    const existing = await database('profiles')
      .where('email', email)
      .orWhere('username', username)
      .first();
    
    if (existing) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const [user] = await database('profiles')
      .insert({
        id: uuidv4(),
        email,
        password_hash: passwordHash,
        username,
        full_name,
        is_organizer: false,
        verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    
    return user;
  },
  
  async getUserById(id: string): Promise<User | null> {
    const user = await database('profiles').where('id', id).first();
    return user || null;
  },
  
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await database('profiles').where('email', email).first();
    return user || null;
  },
  
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const [user] = await database('profiles')
      .where('id', id)
      .update({
        ...input,
        updated_at: new Date(),
      })
      .returning('*');
    
    return user;
  },
  
  async deleteUser(id: string): Promise<void> {
    await database('profiles').where('id', id).delete();
  },
  
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await database('profiles').where('email', email).first();
    
    if (!user || !user.password_hash) {
      return null;
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return null;
    }
    
    return user;
  },
  
  generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, role: user.is_organizer ? 'organizer' : 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  },
  
  async checkUsernameUnique(username: string, excludeId?: string): Promise<boolean> {
    let query = database('profiles').where('username', username);
    
    if (excludeId) {
      query = query.andWhereNot('id', excludeId);
    }
    
    const count = await query.count('id as count').first();
    return Number(count?.count) === 0;
  },
  
  async becomeOrganizer(userId: string, organizerType: string): Promise<User> {
    const [user] = await database('profiles')
      .where('id', userId)
      .update({
        is_organizer: true,
        organizer_type: organizerType,
        updated_at: new Date(),
      })
      .returning('*');
    
    return user;
  },
  
  async searchProfiles(query: string): Promise<User[]> {
    const users = await database('profiles')
      .where('username', 'ilike', `%${query}%`)
      .orWhere('full_name', 'ilike', `%${query}%`)
      .limit(10);
    
    return users;
  },
};
