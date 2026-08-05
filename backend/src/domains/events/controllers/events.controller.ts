import { Request, Response } from 'express';
import { eventsService } from '../services/events.service';
import { AuthRequest } from '../../../shared/middleware/auth';

export const eventsController = {
  async getEvents(req: Request, res: Response) {
    try {
      const { limit, includePast } = req.query;
      const events = await eventsService.getEvents({
        limit: limit ? Number(limit) : undefined,
        includePast: includePast === 'true',
      });
      res.json({ events });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(Number(id));
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      await eventsService.incrementEventView(Number(id));
      res.json({ event });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async createEvent(req: AuthRequest, res: Response) {
    try {
      const event = await eventsService.createEvent({
        ...req.body,
        organizer_id: req.userId!,
      });
      res.status(201).json({ event });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async updateEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventsService.updateEvent(Number(id), req.body);
      res.json({ event });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await eventsService.deleteEvent(Number(id));
      res.json({ message: 'Event deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getOrganizerEvents(req: AuthRequest, res: Response) {
    try {
      const events = await eventsService.getOrganizerEvents(req.userId!);
      res.json({ events });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async toggleLikeEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const liked = await eventsService.toggleLikeEvent(Number(id), req.userId!);
      res.json({ liked });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getEventLikes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const likes = await eventsService.getEventLikes(Number(id));
      res.json({ likes });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getEventAttendees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const attendees = await eventsService.getEventAttendees(Number(id));
      res.json({ attendees });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getEventAnalytics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const analytics = await eventsService.getEventAnalytics(Number(id));
      res.json({ analytics });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
