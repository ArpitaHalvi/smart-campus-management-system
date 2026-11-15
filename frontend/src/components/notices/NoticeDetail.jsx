import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Edit2, Trash2, ArrowLeft, Pin, PinOff, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NoticeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    loadNotice();
    getUserRole();
  }, [id]);

  const getUserRole = async () => {
    try {
      const response = await api.get('/auth/user-role/');
      setUserRole(response.data.role);
    } catch (err) {
      console.error('Failed to get user role');
    }
  };

  const loadNotice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/notices/notices/${id}/`);
      setNotice(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notice');
      toast.error('Failed to load notice');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/notices/notices/${id}/publish/`);
      toast.success('Notice published successfully');
      loadNotice();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/notices/notices/${id}/unpublish/`);
      toast.success('Notice unpublished successfully');
      loadNotice();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unpublish');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async () => {
    try {
      setSubmitting(true);
      if (notice.is_pinned) {
        await api.post(`/notices/notices/${id}/unpin/`);
        toast.success('Notice unpinned');
      } else {
        await api.post(`/notices/notices/${id}/pin/`);
        toast.success('Notice pinned');
      }
      loadNotice();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update pin status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this notice?')) {
      return;
    }

    try {
      setSubmitting(true);
      await api.delete(`/notices/notices/${id}/`);
      toast.success('Notice deleted successfully');
      navigate('/faculty/notices');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete notice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-600" size={20} />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!notice) {
    return <div className="text-gray-600">Notice not found</div>;
  }

  const isFacultyOrAdmin = userRole === 'FACULTY' || userRole === 'ADMIN';

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{notice.title}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-200">
          {!notice.is_published ? (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              Draft
            </span>
          ) : (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              Published
            </span>
          )}

          {notice.is_pinned && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
              <Pin size={12} />
              Pinned
            </span>
          )}

          {isFacultyOrAdmin && (
            <div className="flex gap-2 ml-auto">
              <Link
                to={`/faculty/notices/${id}/edit`}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Edit"
              >
                <Edit2 size={18} className="text-blue-600" />
              </Link>

              {!notice.is_published ? (
                <button
                  onClick={handlePublish}
                  disabled={submitting}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  Publish
                </button>
              ) : (
                <button
                  onClick={handleUnpublish}
                  disabled={submitting}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  Unpublish
                </button>
              )}

              {notice.is_published && (
                <button
                  onClick={handlePin}
                  disabled={submitting}
                  className="p-2 hover:bg-yellow-100 rounded-lg transition disabled:opacity-50"
                  title={notice.is_pinned ? 'Unpin' : 'Pin'}
                >
                  {notice.is_pinned ? (
                    <PinOff size={18} className="text-yellow-600" />
                  ) : (
                    <Pin size={18} className="text-gray-600" />
                  )}
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={submitting}
                className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                title="Delete"
              >
                <Trash2 size={18} className="text-red-600" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-6 mb-6 pb-6 border-b border-gray-200 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>
              Created{' '}
              {new Date(notice.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          {notice.category && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {notice.category}
            </span>
          )}
          {notice.audience_type && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
              Audience: {notice.audience_type}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {notice.content}
          </div>
        </div>
      </div>
    </div>
  );
}
