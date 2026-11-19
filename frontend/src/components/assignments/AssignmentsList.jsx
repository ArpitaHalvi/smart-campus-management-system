import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, FileText, Users, ChevronRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AssignmentsList() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 3 || search.length === 0) {
        fetchAssignments();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // Initial load
    fetchAssignments();
  }, []);

  // Refetch assignments when component comes into focus (e.g., after returning from detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAssignments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const response = await api.get('/assignments/assignments/', { params });
      setAssignments(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignments');
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const daysUntilDeadline = (deadline) => {
    const now = new Date();
    const dead = new Date(deadline);
    const diff = Math.ceil((dead - now) / (1000 * 60 * 60 * 24));
    return diff;
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
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Assignments</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
        {user?.role !== 'STUDENT' && (
          <Link
            to="/faculty/assignments/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            + New Assignment
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search assignments... (minimum 3 characters)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Empty State */}
      {assignments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments</h3>
          <p className="text-gray-600">
            {search
              ? 'No assignments match your search'
              : 'Create your first assignment to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const daysLeft = daysUntilDeadline(assignment.deadline);
            const isOver = isOverdue(assignment.deadline);

            return (
              <Link
                key={assignment.id}
                to={
                  user?.role === 'STUDENT'
                    ? `/student/assignments/${assignment.id}`
                    : `/faculty/assignments/${assignment.id}`
                }
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {assignment.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {assignment.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>
                          {formatDate(assignment.deadline)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{assignment.submission_count} submissions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{assignment.max_marks} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      {!assignment.is_published && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          Draft
                        </span>
                      )}
                      {assignment.is_published && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Published
                        </span>
                      )}
                    </div>

                    {/* Deadline Status */}
                    {assignment.is_published && (
                      <div
                        className={`text-xs font-semibold ${
                          isOver
                            ? 'text-red-600'
                            : daysLeft <= 2
                            ? 'text-orange-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {isOver
                          ? 'Deadline passed'
                          : daysLeft === 0
                          ? 'Due today'
                          : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </div>
                    )}

                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
