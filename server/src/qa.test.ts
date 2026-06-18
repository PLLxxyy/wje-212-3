import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/index';
import db, { initDb } from '../src/database';
import { generateToken } from '../src/auth';

const app = createApp();

describe('QA API - 匿名和登录用户场景测试', () => {
  let testUserId: string;
  let testToken: string;
  let testRequestId: string;

  beforeEach(() => {
    // 清理数据
    db.exec('DELETE FROM qa');
    db.exec('DELETE FROM requests');
    db.exec('DELETE FROM users');

    // 创建测试用户
    testUserId = uuidv4();
    const password = bcrypt.hashSync('123456', 10);
    db.prepare(
      'INSERT INTO users (id, username, password, nickname, phone, building) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(testUserId, 'testuser', password, '测试用户', '13800001111', 'A栋1单元101');

    testToken = generateToken(testUserId);

    // 创建测试求助
    testRequestId = uuidv4();
    db.prepare(
      'INSERT INTO requests (id, user_id, type, description, reward, deadline) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(testRequestId, testUserId, '代买', '测试求助', '10元', '今天');
  });

  describe('GET /api/requests/:id/qa - 获取问答列表', () => {
    it('应该成功获取空的问答列表', async () => {
      const res = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('应该获取包含问答的列表', async () => {
      // 先插入一条问答
      const qaId = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)'
      ).run(qaId, testRequestId, testUserId, '测试问题');

      const res = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].content).toBe('测试问题');
      expect(res.body[0].user_name).toBe('测试用户');
      expect(res.body[0].is_registered).toBe(1);
    });

    it('求助不存在时应该返回404', async () => {
      const res = await request(app).get('/api/requests/invalid-id/qa');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('求助不存在');
    });
  });

  describe('匿名用户场景', () => {
    it('匿名用户应该可以成功提问（带昵称）', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '匿名用户的提问',
          nickname: '匿名小哥'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('提问成功');
      expect(res.body.qa.content).toBe('匿名用户的提问');
      expect(res.body.qa.user_name).toBe('匿名小哥');
      expect(res.body.qa.is_registered).toBe(0);
      expect(res.body.qa.nickname).toBe('匿名小哥');
    });

    it('匿名用户应该可以成功回复（带昵称）', async () => {
      // 先创建一个问题
      const questionId = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)'
      ).run(questionId, testRequestId, testUserId, '这是一个问题');

      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '匿名用户的回复',
          nickname: '热心邻居',
          parent_id: questionId
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('回复成功');
      expect(res.body.qa.content).toBe('匿名用户的回复');
      expect(res.body.qa.parent_id).toBe(questionId);
      expect(res.body.qa.user_name).toBe('热心邻居');
      expect(res.body.qa.is_registered).toBe(0);
    });

    it('匿名用户不带昵称提问应该返回400错误', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '没有昵称的提问'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('请填写昵称');
    });

    it('匿名用户昵称超过20字符应该返回400错误', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '测试内容',
          nickname: 'a'.repeat(21)
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('昵称不能超过20个字符');
    });

    it('匿名用户内容为空应该返回400错误', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '   ',
          nickname: '测试'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('内容不能为空');
    });

    it('匿名用户回复不存在的问题应该返回400错误', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({
          content: '回复不存在的问题',
          nickname: '测试',
          parent_id: 'non-existent-id'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('回复的问题不存在');
    });
  });

  describe('登录用户场景', () => {
    it('登录用户应该可以成功提问', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          content: '登录用户的提问'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('提问成功');
      expect(res.body.qa.content).toBe('登录用户的提问');
      expect(res.body.qa.user_id).toBe(testUserId);
      expect(res.body.qa.user_name).toBe('测试用户');
      expect(res.body.qa.user_building).toBe('A栋1单元101');
      expect(res.body.qa.is_registered).toBe(1);
    });

    it('登录用户应该可以成功回复', async () => {
      // 先创建一个问题
      const questionId = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, nickname, content) VALUES (?, ?, ?, ?)'
      ).run(questionId, testRequestId, '提问者', '这是一个问题');

      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          content: '登录用户的回复',
          parent_id: questionId
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('回复成功');
      expect(res.body.qa.content).toBe('登录用户的回复');
      expect(res.body.qa.parent_id).toBe(questionId);
      expect(res.body.qa.user_name).toBe('测试用户');
      expect(res.body.qa.is_registered).toBe(1);
    });

    it('登录用户内容为空应该返回400错误', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          content: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('内容不能为空');
    });

    it('登录用户使用无效token应该当作匿名用户，需要昵称', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          content: '无效token的请求'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('请填写昵称');
    });

    it('登录用户使用无效token但提供了昵称应该可以成功', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          content: '无效token但有昵称',
          nickname: '匿名用户'
        });

      expect(res.status).toBe(201);
      expect(res.body.qa.is_registered).toBe(0);
      expect(res.body.qa.user_name).toBe('匿名用户');
    });
  });

  describe('混合场景验证', () => {
    it('应该正确显示匿名和登录用户的问答', async () => {
      // 登录用户提问
      const q1Id = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)'
      ).run(q1Id, testRequestId, testUserId, '登录用户的问题');

      // 匿名用户提问
      const q2Id = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, nickname, content) VALUES (?, ?, ?, ?)'
      ).run(q2Id, testRequestId, '匿名甲', '匿名用户的问题');

      // 匿名用户回复问题1
      const r1Id = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, nickname, content, parent_id) VALUES (?, ?, ?, ?, ?)'
      ).run(r1Id, testRequestId, '匿名乙', '匿名回复', q1Id);

      // 登录用户回复问题2
      const r2Id = uuidv4();
      db.prepare(
        'INSERT INTO qa (id, request_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)'
      ).run(r2Id, testRequestId, testUserId, '登录用户回复', q2Id);

      const res = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(4);

      // 验证登录用户问题
      const q1 = res.body.find((x: any) => x.id === q1Id);
      expect(q1.is_registered).toBe(1);
      expect(q1.user_name).toBe('测试用户');
      expect(q1.user_building).toBe('A栋1单元101');

      // 验证匿名用户问题
      const q2 = res.body.find((x: any) => x.id === q2Id);
      expect(q2.is_registered).toBe(0);
      expect(q2.user_name).toBe('匿名甲');
      expect(q2.user_building).toBeNull();

      // 验证匿名回复
      const r1 = res.body.find((x: any) => x.id === r1Id);
      expect(r1.is_registered).toBe(0);
      expect(r1.user_name).toBe('匿名乙');

      // 验证登录用户回复
      const r2 = res.body.find((x: any) => x.id === r2Id);
      expect(r2.is_registered).toBe(1);
      expect(r2.user_name).toBe('测试用户');
    });
  });

  describe('外键约束测试 - 数据完整性校验', () => {
    it('应该拒绝插入不存在的 request_id', () => {
      const nonExistentRequestId = uuidv4();
      expect(() => {
        db.prepare(
          'INSERT INTO qa (id, request_id, nickname, content) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), nonExistentRequestId, '测试用户', '测试内容');
      }).toThrow();
    });

    it('应该拒绝插入不存在的 user_id', () => {
      const nonExistentUserId = uuidv4();
      expect(() => {
        db.prepare(
          'INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), testRequestId, nonExistentUserId, '测试内容');
      }).toThrow();
    });

    it('应该拒绝插入不存在的 parent_id', () => {
      const nonExistentParentId = uuidv4();
      expect(() => {
        db.prepare(
          'INSERT INTO qa (id, request_id, nickname, content, parent_id) VALUES (?, ?, ?, ?, ?)'
        ).run(uuidv4(), testRequestId, '测试用户', '测试回复', nonExistentParentId);
      }).toThrow();
    });

    it('user_id 为 NULL 时应该允许插入（匿名用户）', () => {
      expect(() => {
        db.prepare(
          'INSERT INTO qa (id, request_id, nickname, content) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), testRequestId, '匿名用户', '匿名提问');
      }).not.toThrow();
    });

    it('parent_id 为 NULL 时应该允许插入（新问题）', () => {
      expect(() => {
        db.prepare(
          'INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), testRequestId, testUserId, '新问题');
      }).not.toThrow();
    });
  });

  describe('数据库结构校验测试', () => {
    it('qa 表应该包含所有必需字段', () => {
      const columns = db.prepare("PRAGMA table_info(qa)").all() as { name: string; notnull: number }[];
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('request_id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('nickname');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('parent_id');
      expect(columnNames).toContain('created_at');
    });

    it('user_id 字段应该允许 NULL', () => {
      const columns = db.prepare("PRAGMA table_info(qa)").all() as { name: string; notnull: number }[];
      const userIdCol = columns.find(c => c.name === 'user_id');
      expect(userIdCol).toBeDefined();
      expect(userIdCol!.notnull).toBe(0);
    });

    it('应该存在所有必需的外键约束', () => {
      const foreignKeys = db.prepare("PRAGMA foreign_key_list(qa)").all() as { table: string; from: string }[];

      const hasRequestFK = foreignKeys.some(fk => fk.table === 'requests' && fk.from === 'request_id');
      const hasUserFK = foreignKeys.some(fk => fk.table === 'users' && fk.from === 'user_id');
      const hasParentFK = foreignKeys.some(fk => fk.table === 'qa' && fk.from === 'parent_id');

      expect(hasRequestFK).toBe(true);
      expect(hasUserFK).toBe(true);
      expect(hasParentFK).toBe(true);
    });

    it('request_id 字段应该为 NOT NULL', () => {
      const columns = db.prepare("PRAGMA table_info(qa)").all() as { name: string; notnull: number }[];
      const requestIdCol = columns.find(c => c.name === 'request_id');
      expect(requestIdCol).toBeDefined();
      expect(requestIdCol!.notnull).toBe(1);
    });
  });

  describe('数据库迁移场景测试 - 模拟旧库升级', () => {
    let tempDbPath: string;

    beforeEach(() => {
      tempDbPath = path.join(__dirname, `temp-test-${uuidv4()}.db`);
    });

    afterEach(() => {
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
      const shmPath = tempDbPath + '-shm';
      const walPath = tempDbPath + '-wal';
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    });

    it('应该正确迁移 user_id NOT NULL 的旧表到允许 NULL', () => {
      const tempDb = new Database(tempDbPath);

      tempDb.pragma('foreign_keys = ON');

      tempDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nickname TEXT NOT NULL,
          phone TEXT NOT NULL,
          building TEXT NOT NULL
        );
        CREATE TABLE requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          reward TEXT NOT NULL,
          deadline TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE qa (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          parent_id TEXT,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (request_id) REFERENCES requests(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (parent_id) REFERENCES qa(id)
        );
      `);

      const userId = uuidv4();
      const requestId = uuidv4();
      const qaId = uuidv4();

      tempDb.prepare('INSERT INTO users (id, username, password, nickname, phone, building) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, 'test', 'pass', 'Test', '13800001111', 'A栋');
      tempDb.prepare('INSERT INTO requests (id, user_id, type, description, reward, deadline) VALUES (?, ?, ?, ?, ?, ?)')
        .run(requestId, userId, '代买', '测试', '10元', '今天');
      tempDb.prepare('INSERT INTO qa (id, request_id, user_id, content) VALUES (?, ?, ?, ?)')
        .run(qaId, requestId, userId, '旧数据');

      tempDb.close();

      const migratedDb = initDb(tempDbPath);

      const columns = migratedDb.prepare("PRAGMA table_info(qa)").all() as { name: string; notnull: number }[];
      const hasNickname = columns.some(c => c.name === 'nickname');
      const userIdCol = columns.find(c => c.name === 'user_id');

      expect(hasNickname).toBe(true);
      expect(userIdCol!.notnull).toBe(0);

      const foreignKeys = migratedDb.prepare("PRAGMA foreign_key_list(qa)").all() as { table: string; from: string }[];
      const hasRequestFK = foreignKeys.some(fk => fk.table === 'requests' && fk.from === 'request_id');
      const hasUserFK = foreignKeys.some(fk => fk.table === 'users' && fk.from === 'user_id');
      const hasParentFK = foreignKeys.some(fk => fk.table === 'qa' && fk.from === 'parent_id');

      expect(hasRequestFK).toBe(true);
      expect(hasUserFK).toBe(true);
      expect(hasParentFK).toBe(true);

      const data = migratedDb.prepare('SELECT * FROM qa WHERE id = ?').get(qaId) as any;
      expect(data).toBeDefined();
      expect(data.content).toBe('旧数据');
      expect(data.user_id).toBe(userId);
      expect(data.nickname).toBeNull();

      migratedDb.close();
    });

    it('应该正确修复缺失外键的旧表', () => {
      const tempDb = new Database(tempDbPath);

      tempDb.pragma('foreign_keys = ON');

      tempDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nickname TEXT NOT NULL,
          phone TEXT NOT NULL,
          building TEXT NOT NULL
        );
        CREATE TABLE requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          reward TEXT NOT NULL,
          deadline TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE qa (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          user_id TEXT,
          nickname TEXT,
          content TEXT NOT NULL,
          parent_id TEXT,
          created_at TEXT DEFAULT (datetime('now','localtime'))
        );
      `);

      const userId = uuidv4();
      const requestId = uuidv4();
      const qaId = uuidv4();

      tempDb.prepare('INSERT INTO users (id, username, password, nickname, phone, building) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, 'test', 'pass', 'Test', '13800001111', 'A栋');
      tempDb.prepare('INSERT INTO requests (id, user_id, type, description, reward, deadline) VALUES (?, ?, ?, ?, ?, ?)')
        .run(requestId, userId, '代买', '测试', '10元', '今天');
      tempDb.prepare('INSERT INTO qa (id, request_id, user_id, nickname, content) VALUES (?, ?, ?, ?, ?)')
        .run(qaId, requestId, userId, null, '旧数据无外键');

      tempDb.close();

      const migratedDb = initDb(tempDbPath);

      const foreignKeys = migratedDb.prepare("PRAGMA foreign_key_list(qa)").all() as { table: string; from: string }[];
      const hasRequestFK = foreignKeys.some(fk => fk.table === 'requests' && fk.from === 'request_id');
      const hasUserFK = foreignKeys.some(fk => fk.table === 'users' && fk.from === 'user_id');
      const hasParentFK = foreignKeys.some(fk => fk.table === 'qa' && fk.from === 'parent_id');

      expect(hasRequestFK).toBe(true);
      expect(hasUserFK).toBe(true);
      expect(hasParentFK).toBe(true);

      expect(() => {
        migratedDb.prepare('INSERT INTO qa (id, request_id, nickname, content) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), 'non-existent', '测试', '应该失败');
      }).toThrow();

      const data = migratedDb.prepare('SELECT * FROM qa WHERE id = ?').get(qaId) as any;
      expect(data).toBeDefined();
      expect(data.content).toBe('旧数据无外键');

      migratedDb.close();
    });
  });

  describe('接口回归测试', () => {
    it('匿名用户提问后应该能查询到', async () => {
      const postRes = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({ content: '回归测试提问', nickname: '测试用户' });

      expect(postRes.status).toBe(201);
      const qaId = postRes.body.qa.id;

      const getRes = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(getRes.status).toBe(200);
      const qa = getRes.body.find((x: any) => x.id === qaId);
      expect(qa).toBeDefined();
      expect(qa.content).toBe('回归测试提问');
      expect(qa.user_name).toBe('测试用户');
      expect(qa.is_registered).toBe(0);
    });

    it('登录用户提问后应该能查询到', async () => {
      const postRes = await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ content: '登录用户回归测试' });

      expect(postRes.status).toBe(201);
      const qaId = postRes.body.qa.id;

      const getRes = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(getRes.status).toBe(200);
      const qa = getRes.body.find((x: any) => x.id === qaId);
      expect(qa).toBeDefined();
      expect(qa.content).toBe('登录用户回归测试');
      expect(qa.user_name).toBe('测试用户');
      expect(qa.is_registered).toBe(1);
      expect(qa.user_building).toBe('A栋1单元101');
    });

    it('匿名和登录用户混合问答应该正确展示', async () => {
      await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .send({ content: '匿名问题1', nickname: '匿名A' });

      await request(app)
        .post(`/api/requests/${testRequestId}/qa`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ content: '登录问题1' });

      const qas = await request(app).get(`/api/requests/${testRequestId}/qa`);
      expect(qas.status).toBe(200);
      expect(qas.body.length).toBe(2);

      const anonymousQa = qas.body.find((x: any) => x.content === '匿名问题1');
      const loggedInQa = qas.body.find((x: any) => x.content === '登录问题1');

      expect(anonymousQa.is_registered).toBe(0);
      expect(anonymousQa.user_name).toBe('匿名A');
      expect(loggedInQa.is_registered).toBe(1);
      expect(loggedInQa.user_name).toBe('测试用户');
    });
  });
});
