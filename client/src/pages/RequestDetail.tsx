import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

const STATUS_LABELS: Record<string, string> = {
  open: '等待接单', accepted: '已接单，等待确认', in_progress: '进行中', completed: '已完成'
};

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [qaList, setQaList] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaContent, setQaContent] = useState('');
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      const data = await api.getRequestDetail(id!);
      setRequest(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchQA = async () => {
    try {
      setQaLoading(true);
      const data = await api.getQA(id!);
      setQaList(data);
    } catch (err: any) {
      console.error('获取问答失败', err);
    } finally {
      setQaLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail();
      fetchQA();
    }
  }, [id]);

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await action();
      setMessage({ type: 'success', text: successMsg });
      await fetchDetail();
      await refreshUser();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () => handleAction(() => api.acceptRequest(id!), '接单成功！等待求助人确认开始');
  const handleConfirmStart = () => handleAction(() => api.confirmStart(id!), '已确认开始！');
  const handleComplete = () => handleAction(() => api.completeRequest(id!), '求助已完成！');

  const handleReview = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api.reviewRequest(id!, rating, comment);
      setMessage({ type: 'success', text: '评价成功！' });
      setShowReview(false);
      await fetchDetail();
      await refreshUser();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!qaContent.trim()) return;
    try {
      setQaSubmitting(true);
      await api.postQA(id!, qaContent);
      setQaContent('');
      await fetchQA();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setQaSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    try {
      setReplySubmitting(parentId);
      await api.postQA(id!, replyContent, parentId);
      setReplyToId(null);
      setReplyContent('');
      await fetchQA();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setReplySubmitting(null);
    }
  };

  const renderQA = () => {
    const questions = qaList.filter((item: any) => !item.parent_id);
    const replies = qaList.filter((item: any) => item.parent_id);

    return (
      <div className="qa-section">
        <div className="qa-section-title">
          <span>&#128172;</span> 问答交流 <span style={{ color: '#999', fontWeight: 400, fontSize: 13 }}>({qaList.length})</span>
        </div>

        {qaLoading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : questions.length === 0 ? (
          <div className="qa-empty">暂无问答，快来第一个提问吧～</div>
        ) : (
          <div className="qa-list">
            {questions.map((q: any) => (
              <div key={q.id}>
                <div className="qa-item">
                  <div className="qa-item-header">
                    <span className="qa-item-user">
                      {q.user_name}
                      <span className="qa-user-building">（{q.user_building}）</span>
                    </span>
                    <span className="qa-item-time">{q.created_at}</span>
                  </div>
                  <div className="qa-item-content">{q.content}</div>
                  {user && (
                    <div className="qa-item-actions">
                      <button
                        className="qa-reply-btn"
                        onClick={() => {
                          setReplyToId(replyToId === q.id ? null : q.id);
                          setReplyContent('');
                        }}
                      >
                        {replyToId === q.id ? '取消回复' : '回复'}
                      </button>
                    </div>
                  )}
                  {replyToId === q.id && (
                    <div className="qa-reply-form">
                      <textarea
                        placeholder="写下你的回复..."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        rows={2}
                      />
                      <div className="qa-reply-form-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setReplyToId(null); setReplyContent(''); }}
                        >
                          取消
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSubmitReply(q.id)}
                          disabled={replySubmitting === q.id || !replyContent.trim()}
                        >
                          {replySubmitting === q.id ? '发送中...' : '发送回复'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {replies
                  .filter((r: any) => r.parent_id === q.id)
                  .map((r: any) => (
                    <div key={r.id} className="qa-item is-reply" style={{ marginTop: 8 }}>
                      <div className="qa-item-header">
                        <span className="qa-item-user">
                          {r.user_name}
                          <span className="qa-user-building">（{r.user_building}）</span>
                        </span>
                        <span className="qa-item-time">{r.created_at}</span>
                      </div>
                      <div className="qa-item-content">{r.content}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {user ? (
          <div className="qa-form">
            <div className="qa-form-label">我要提问</div>
            <textarea
              placeholder="有什么想问的？比如具体时间、地点、要求等..."
              value={qaContent}
              onChange={e => setQaContent(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
            />
            <div className="qa-form-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setQaContent('')}
                disabled={!qaContent.trim()}
              >
                清空
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitQuestion}
                disabled={qaSubmitting || !qaContent.trim()}
              >
                {qaSubmitting ? '发送中...' : '提交提问'}
              </button>
            </div>
          </div>
        ) : (
          <div className="qa-login-tip">
            <a onClick={() => navigate('/login')}>登录</a> 后可以提问和回复
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!request) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#10060;</div>
        <div className="empty-state-text">求助不存在或已被删除</div>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const isPublisher = user?.id === request.user_id;
  const isHelper = user?.id === request.helper_id;
  const hasReview = request.review;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        &larr; 返回
      </button>

      {message && (
        <div className={message.type === 'success' ? 'success-msg' : 'error-msg'}>{message.text}</div>
      )}

      <div className="detail-card">
        <div className="detail-header">
          <span className={`request-type type-${request.type}`} style={{ fontSize: 14, padding: '5px 14px' }}>
            {request.type}
          </span>
          <span className={`request-status status-${request.status}`} style={{ fontSize: 13, padding: '4px 12px' }}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">求助描述</span>
          <span className="detail-value" style={{ fontSize: 15 }}>{request.description}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">期望报酬</span>
          <span className="detail-value" style={{ color: '#E65100', fontWeight: 700, fontSize: 16 }}>{request.reward}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">完成时间</span>
          <span className="detail-value">{request.deadline}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">发布人</span>
          <span className="detail-value">
            {request.publisher_name}（{request.publisher_building}）
            {user && <span style={{ color: '#999', marginLeft: 8 }}>电话: {request.publisher_phone}</span>}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">发布时间</span>
          <span className="detail-value">{request.created_at}</span>
        </div>

        {request.helper_name && (
          <div className="detail-row">
            <span className="detail-label">帮助者</span>
            <span className="detail-value">
              {request.helper_name}
              {user && request.helper_phone && <span style={{ color: '#999', marginLeft: 8 }}>电话: {request.helper_phone}</span>}
            </span>
          </div>
        )}

        {request.started_at && (
          <div className="detail-row">
            <span className="detail-label">接单时间</span>
            <span className="detail-value">{request.started_at}</span>
          </div>
        )}

        {request.completed_at && (
          <div className="detail-row">
            <span className="detail-label">完成时间</span>
            <span className="detail-value">{request.completed_at}</span>
          </div>
        )}

        {/* Review */}
        {hasReview && (
          <div className="review-card">
            <div className="review-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>求助人评价</span>
              <span className="review-stars">{'★'.repeat(hasReview.rating)}{'☆'.repeat(5 - hasReview.rating)}</span>
            </div>
            {hasReview.comment && <div className="review-text">{hasReview.comment}</div>}
          </div>
        )}

        {/* Action buttons */}
        {user && (
          <div className="detail-actions">
            {/* 未登录用户只看，不能操作 */}
            {/* 其他人可以接单 */}
            {request.status === 'open' && !isPublisher && (
              <button className="btn btn-primary" onClick={handleAccept} disabled={actionLoading}>
                {actionLoading ? '处理中...' : '我来帮忙'}
              </button>
            )}

            {/* 发布人确认开始 */}
            {request.status === 'accepted' && isPublisher && (
              <button className="btn btn-primary" onClick={handleConfirmStart} disabled={actionLoading}>
                {actionLoading ? '处理中...' : '确认开始'}
              </button>
            )}

            {/* 发布人确认完成 */}
            {request.status === 'in_progress' && isPublisher && (
              <button className="btn btn-primary" onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? '处理中...' : '确认完成'}
              </button>
            )}

            {/* 发布人评价 */}
            {request.status === 'completed' && isPublisher && !hasReview && (
              <button className="btn btn-warn" onClick={() => setShowReview(true)}>
                评价帮助者
              </button>
            )}
          </div>
        )}

        {!user && request.status === 'open' && (
          <div className="detail-actions">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              登录后帮忙
            </button>
          </div>
        )}
      </div>

      {renderQA()}

      {/* Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">评价帮助者</div>
            <div className="form-group">
              <label>服务评分</label>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`rating-star ${star <= rating ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                  >
                    &#9733;
                  </span>
                ))}
                <span style={{ marginLeft: 8, fontSize: 14, color: '#888' }}>{rating} 分</span>
              </div>
            </div>
            <div className="form-group">
              <label>评价内容（可选）</label>
              <textarea
                placeholder="说说您的感受..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReview(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={actionLoading}>
                {actionLoading ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
