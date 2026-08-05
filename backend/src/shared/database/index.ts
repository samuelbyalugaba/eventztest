import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

export const database = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations',
  },
});

export const connect = async () => {
  try {
    await database.raw('SELECT 1');
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const disconnect = async () => {
  await database.destroy();
};
