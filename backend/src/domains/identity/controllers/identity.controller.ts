import { Request, Response } from 'express';
import { identityService } from '../services/identity.service';
import { AuthRequest } from '../../../shared/middleware/auth';

export const identityController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, username, full_name } = req.body;
      
      const user = await identityService.createUser({
        email,
        password,
        username,
        full_name,
      });
      
      const token = identityService.generateToken(user);
      
      res.status(201).json({ user, token });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const user = await identityService.verifyPassword(email, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = identityService.generateToken(user);
      
      res.json({ user, token });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await identityService.getUserById(req.userId!);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const user = await identityService.updateUser(req.userId!, req.body);
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      await identityService.deleteUser(req.userId!);
      res.json({ message: 'Account deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const unique = await identityService.checkUsernameUnique(username);
      res.json({ unique });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async becomeOrganizer(req: AuthRequest, res: Response) {
    try {
      const { organizer_type } = req.body;
      const user = await identityService.becomeOrganizer(req.userId!, organizer_type);
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async searchProfiles(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const users = await identityService.searchProfiles(q as string);
      res.json({ users });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
