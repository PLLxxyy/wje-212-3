import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './database';

console.log('正在初始化数据库种子数据...');

// 清空已有数据
db.exec('DELETE FROM reviews');
db.exec('DELETE FROM requests');
db.exec('DELETE FROM users');

// 创建测试用户
const password = bcrypt.hashSync('123456', 10);

const users = [
  { id: uuidv4(), username: 'zhangsan', nickname: '张三', phone: '13800001111', building: 'A栋3单元502' },
  { id: uuidv4(), username: 'lisi', nickname: '李四', phone: '13800002222', building: 'B栋1单元201' },
  { id: uuidv4(), username: 'wangwu', nickname: '王五', phone: '13800003333', building: 'C栋2单元103' },
  { id: uuidv4(), username: 'zhaoliu', nickname: '赵六', phone: '13800004444', building: 'A栋1单元801' },
  { id: uuidv4(), username: 'sunqi', nickname: '孙七', phone: '13800005555', building: 'D栋4单元302' },
  { id: uuidv4(), username: 'zhouba', nickname: '周八', phone: '13800006666', building: 'B栋2单元601' },
  { id: uuidv4(), username: 'wujiu', nickname: '吴九', phone: '13800007777', building: 'E栋1单元405' },
  { id: uuidv4(), username: 'zhengshi', nickname: '郑十', phone: '13800008888', building: 'C栋3单元202' },
];

const insertUser = db.prepare(
  'INSERT INTO users (id, username, password, nickname, phone, building, points, help_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

for (const u of users) {
  insertUser.run(u.id, u.username, password, u.nickname, u.phone, u.building, 0, 0);
}

// 给部分用户设置积分
db.prepare('UPDATE users SET points = 30, help_count = 5 WHERE username = ?').run('lisi');
db.prepare('UPDATE users SET points = 22, help_count = 4 WHERE username = ?').run('zhaoliu');
db.prepare('UPDATE users SET points = 16, help_count = 3 WHERE username = ?').run('wangwu');
db.prepare('UPDATE users SET points = 10, help_count = 2 WHERE username = ?').run('sunqi');
db.prepare('UPDATE users SET points = 6, help_count = 1 WHERE username = ?').run('zhouba');

// 创建求助数据
const requests = [
  {
    id: uuidv4(), userId: users[0].id, type: '代买',
    description: '家里酱油用完了，麻烦帮忙买一瓶海天酱油，我转钱给你',
    reward: '10元', deadline: '今天下午5点前', status: 'open'
  },
  {
    id: uuidv4(), userId: users[2].id, type: '搬运',
    description: '买了一个书柜，需要从小区门口搬到C栋2单元103，比较重需要两个人',
    reward: '20元', deadline: '明天上午', status: 'open'
  },
  {
    id: uuidv4(), userId: users[4].id, type: '维修',
    description: '厨房水龙头漏水，需要有经验的邻居帮忙看看，可能需要换零件',
    reward: '面议', deadline: '这周内', status: 'open'
  },
  {
    id: uuidv4(), userId: users[6].id, type: '照看',
    description: '周六下午有事需要出门3小时，家里有个5岁小孩需要人照看一下',
    reward: '20元', deadline: '本周六下午2-5点', status: 'open'
  },
  {
    id: uuidv4(), userId: users[0].id, type: '辅导',
    description: '孩子初二数学有些题不会做，需要一位数学好的邻居帮忙辅导一下',
    reward: '免费', deadline: '周末', status: 'open'
  },
  {
    id: uuidv4(), userId: users[3].id, type: '跑腿',
    description: '在医院打点滴走不开，需要人帮忙去菜鸟驿站取3个快递',
    reward: '10元', deadline: '今天下午3点前', status: 'open'
  },
  // 已接单的
  {
    id: uuidv4(), userId: users[1].id, type: '代买',
    description: '需要买一些常用药（感冒药、创可贴），楼下药店就有',
    reward: '10元', deadline: '今天内',
    status: 'accepted', helperId: users[3].id
  },
  // 进行中的
  {
    id: uuidv4(), userId: users[5].id, type: '搬运',
    description: '帮忙把阳台的花盆搬到楼下，一共6盆大花盆',
    reward: '10元', deadline: '今天下午',
    status: 'in_progress', helperId: users[1].id
  },
  // 已完成的
  {
    id: uuidv4(), userId: users[7].id, type: '维修',
    description: '卧室灯不亮了，可能是灯泡坏了需要更换',
    reward: '免费', deadline: '尽快',
    status: 'completed', helperId: users[1].id
  },
  {
    id: uuidv4(), userId: users[0].id, type: '跑腿',
    description: '需要帮忙拿一下快递，手机尾号1234，菜鸟驿站',
    reward: '免费', deadline: '今天',
    status: 'completed', helperId: users[3].id
  },
];

const insertRequest = db.prepare(
  'INSERT INTO requests (id, user_id, type, description, reward, deadline, status, helper_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

for (const r of requests) {
  insertRequest.run(r.id, r.userId, r.type, r.description, r.reward, r.deadline, r.status, r.helperId || null);
}

// 给已完成的求助添加评价
const completedRequests = requests.filter(r => r.status === 'completed');
const insertReview = db.prepare(
  'INSERT INTO reviews (id, request_id, reviewer_id, helper_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)'
);

insertReview.run(uuidv4(), completedRequests[0].id, users[7].id, users[1].id, 5, '非常热心的邻居，很快就帮忙修好了，还检查了其他灯泡！');
insertReview.run(uuidv4(), completedRequests[1].id, users[0].id, users[3].id, 4, '快递很快就取回来了，很感谢！');

console.log('种子数据初始化完成！');
console.log(`  用户: ${users.length} 个`);
console.log(`  求助: ${requests.length} 条`);
console.log('  评价: 2 条');
console.log('');
console.log('测试账号（密码均为 123456）:');
users.forEach(u => {
  console.log(`  ${u.username} - ${u.nickname} (${u.building})`);
});

process.exit(0);
