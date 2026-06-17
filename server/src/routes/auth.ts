import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { generateToken } from '../auth';

const router = Router();

// 注册
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password, nickname, phone, building } = req.body;

    if (!username || !password || !nickname || !phone || !building) {
      res.status(400).json({ error: '请填写所有必填信息' });
      return;
    }

    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ error: '用户名长度需在3-20个字符之间' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: '密码长度至少6位' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    db.prepare(
      'INSERT INTO users (id, username, password, nickname, phone, building) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, username, hashedPassword, nickname, phone, building);

    const token = generateToken(id);

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id, username, nickname, phone, building, points: 0, help_count: 0 }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '注册失败' });
  }
});

// 登录
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '请输入用户名和密码' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        building: user.building,
        points: user.points,
        help_count: user.help_count
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '登录失败' });
  }
});

export default router;
