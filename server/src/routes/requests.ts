import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// 获取求助列表（首页）
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { type, status, search } = req.query;
    let sql = `
      SELECT r.*, u.nickname as publisher_name, u.building as publisher_building,
             h.nickname as helper_name
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users h ON r.helper_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'all') {
      sql += ' AND r.type = ?';
      params.push(type);
    }
    if (status && status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (r.description LIKE ? OR r.type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY r.created_at DESC';

    const requests = db.prepare(sql).all(...params);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取求助列表失败' });
  }
});

// 获取求助详情
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const request = db.prepare(`
      SELECT r.*, u.nickname as publisher_name, u.building as publisher_building,
             u.phone as publisher_phone,
             h.nickname as helper_name, h.phone as helper_phone
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users h ON r.helper_id = h.id
      WHERE r.id = ?
    `).get(req.params.id) as any;

    if (!request) {
      res.status(404).json({ error: '求助不存在' });
      return;
    }

    // 如果已完成，获取评价信息
    let review = null;
    if (request.status === 'completed') {
      review = db.prepare('SELECT * FROM reviews WHERE request_id = ?').get(req.params.id);
    }

    res.json({ ...request, review });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取详情失败' });
  }
});

// 发布求助
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { type, description, reward, deadline } = req.body;

    if (!type || !description || !reward || !deadline) {
      res.status(400).json({ error: '请填写所有必填信息' });
      return;
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO requests (id, user_id, type, description, reward, deadline) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, req.userId, type, description, reward, deadline);

    const request = db.prepare(`
      SELECT r.*, u.nickname as publisher_name, u.building as publisher_building
      FROM requests r LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id);

    res.status(201).json({ message: '求助发布成功', request });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '发布失败' });
  }
});

// 接单（我来帮忙）
router.post('/:id/accept', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) as any;
    if (!request) {
      res.status(404).json({ error: '求助不存在' });
      return;
    }
    if (request.status !== 'open') {
      res.status(400).json({ error: '该求助已被接单或已完成' });
      return;
    }
    if (request.user_id === req.userId) {
      res.status(400).json({ error: '不能接自己的求助' });
      return;
    }

    db.prepare(
      "UPDATE requests SET helper_id = ?, status = 'accepted', started_at = datetime('now','localtime') WHERE id = ?"
    ).run(req.userId, req.params.id);

    res.json({ message: '接单成功，等待求助人确认开始' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '接单失败' });
  }
});

// 确认开始（求助人确认帮助者开始）
router.post('/:id/confirm-start', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) as any;
    if (!request) {
      res.status(404).json({ error: '求助不存在' });
      return;
    }
    if (request.user_id !== req.userId) {
      res.status(403).json({ error: '只有求助发起人可以确认' });
      return;
    }
    if (request.status !== 'accepted') {
      res.status(400).json({ error: '当前状态无法确认开始' });
      return;
    }

    db.prepare("UPDATE requests SET status = 'in_progress' WHERE id = ?").run(req.params.id);
    res.json({ message: '已确认开始，帮助者可以开始帮忙了' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '确认失败' });
  }
});

// 完成求助
router.post('/:id/complete', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) as any;
    if (!request) {
      res.status(404).json({ error: '求助不存在' });
      return;
    }
    if (request.user_id !== req.userId) {
      res.status(403).json({ error: '只有求助发起人可以确认完成' });
      return;
    }
    if (request.status !== 'in_progress') {
      res.status(400).json({ error: '当前状态无法确认完成' });
      return;
    }

    db.prepare(
      "UPDATE requests SET status = 'completed', completed_at = datetime('now','localtime') WHERE id = ?"
    ).run(req.params.id);

    res.json({ message: '求助已完成，请对帮助者进行评价' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '确认失败' });
  }
});

// 评价帮助者
router.post('/:id/review', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: '评分需在1-5之间' });
      return;
    }

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) as any;
    if (!request) {
      res.status(404).json({ error: '求助不存在' });
      return;
    }
    if (request.user_id !== req.userId) {
      res.status(403).json({ error: '只有求助发起人可以评价' });
      return;
    }
    if (request.status !== 'completed') {
      res.status(400).json({ error: '求助未完成，无法评价' });
      return;
    }

    const existingReview = db.prepare('SELECT id FROM reviews WHERE request_id = ?').get(req.params.id);
    if (existingReview) {
      res.status(400).json({ error: '已评价过该求助' });
      return;
    }

    const reviewId = uuidv4();
    db.prepare(
      'INSERT INTO reviews (id, request_id, reviewer_id, helper_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(reviewId, req.params.id, req.userId, request.helper_id, rating, comment || '');

    // 给帮助者加积分
    const pointsToAdd = rating * 2;
    db.prepare('UPDATE users SET points = points + ?, help_count = help_count + 1 WHERE id = ?')
      .run(pointsToAdd, request.helper_id);

    res.json({ message: '评价成功', pointsAdded: pointsToAdd });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '评价失败' });
  }
});

export default router;
