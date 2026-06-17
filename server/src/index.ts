import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import userRoutes from './routes/users';

const app = express();
const PORT = Number(process.env.PORT) || 3212;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '邻里互助服务运行正常' });
});

app.listen(PORT, () => {
  console.log(`邻里互助后端服务已启动: http://localhost:${PORT}`);
});

export default app;
