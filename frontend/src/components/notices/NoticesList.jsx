import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Plus, MessageSquare, Calendar, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function NoticesList() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 3 || search.length === 0) {
        fetchNotices();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, category]);

  useEffect(() => {
    getUserRole();
    fetchCategories();
    fetchNotices();
  }, []);

  // Refetch notices when component comes into focus (e.g., after returning from detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotices();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getUserRole = async () => {
    try {
      const response = await api.get('/auth/user-role/');
      setUserRole(response.data.role);
    } catch (err) {
      console.error('Failed to get user role');
    }
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const response = await api.get('/notices/notices/', { params });
      setNotices(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notices');
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/notices/notices/categories/');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
        {(userRole === 'FACULTY' || userRole === 'ADMIN') && (
          <Link
            to="/faculty/notices/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={18} />
            New Notice
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-xs">
          <input
            type="text"
            placeholder="Search notices... (minimum 3 characters)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search.length > 0 && search.length < 3 && (
            <p className="text-xs text-amber-600 mt-1">
              Type at least {3 - search.length} more character{3 - search.length !== 1 ? 's' : ''} to search
            </p>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories && categories.length > 0 && categories.map((cat) => {
            const catValue = cat.value || cat;
            const catLabel = cat.label || cat;
            return (
              <option key={catValue} value={catValue}>
                {catLabel}
              </option>
            );
          })}
        </select>
      </div>

      {/* Empty State */}
      {notices.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notices</h3>
          <p className="text-gray-600">
            {search || category ? 'No notices match your filters' : 'No notices available yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notices.map((notice) => (
            <Link
              key={notice.id}
              to={
                user?.role === 'STUDENT'
                  ? `/student/notices/${notice.id}`
                  : `/faculty/notices/${notice.id}`
              }
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition p-6 relative"
            >
              {notice.is_pinned && (
                <div className="absolute top-4 right-4 text-yellow-500">
                  <Pin size={20} fill="currentColor" />
                </div>
              )}

              <div className="pr-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{notice.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{notice.content}</p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{formatDate(notice.published_at || notice.created_at)}</span>
                  </div>
                  {notice.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {notice.category_display || notice.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="absolute bottom-4 right-4 flex gap-2 items-center">
                {notice.is_published ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Published
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Draft
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
