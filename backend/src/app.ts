import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes'; // Importa el index.ts de routes

const app: Application = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/v1', routes);

// Health Check
app.get('/', (req, res) => {
  res.send('API funcionando correctamente 🚀');
});

export default app;