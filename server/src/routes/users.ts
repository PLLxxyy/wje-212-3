import { Router, Response } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// 获取当前用户信息
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(
      'SELECT id, username, nickname, phone, building, points, help_count, created_at FROM users WHERE id = ?'
    ).get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取用户信息失败' });
  }
});

// 我发的求助
router.get('/me/requests', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, h.nickname as helper_name
      FROM requests r
      LEFT JOIN users h ON r.helper_id = h.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.userId);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取我的求助失败' });
  }
});

// 我接的单
router.get('/me/helped', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, u.nickname as publisher_name, u.building as publisher_building
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.helper_id = ?
      ORDER BY r.created_at DESC
    `).all(req.userId);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取我的接单失败' });
  }
});

// 积分排行榜
router.get('/leaderboard', (_req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare(
      'SELECT id, nickname, building, points, help_count FROM users ORDER BY points DESC LIMIT 20'
    ).all();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取排行榜失败' });
  }
});

export default router;
