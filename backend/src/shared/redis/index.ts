import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let client: RedisClientType;

export const redis = {
  connect: async () => {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    client.on('error', (err) => console.error('Redis error:', err));
    
    await client.connect();
    console.log('Redis connected');
  },
  
  disconnect: async () => {
    if (client) {
      await client.disconnect();
    }
  },
  
  get: async (key: string) => {
    return client.get(key);
  },
  
  set: async (key: string, value: string, ttl?: number) => {
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  },
  
  del: async (key: string) => {
    return client.del(key);
  },
  
  publish: async (channel: string, message: string) => {
    return client.publish(channel, message);
  },
  
  subscribe: async (channel: string, callback: (message: string) => void) => {
    const subscriber = client.duplicate();
    await subscriber.subscribe(channel, (message) => {
      callback(message);
    });
    return subscriber;
  },
};
