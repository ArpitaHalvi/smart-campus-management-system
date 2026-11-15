import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Download, Edit2, Trash2, ArrowLeft, Users, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    loadAssignment();
    getUserRole();
  }, [id]);

  const getUserRole = async () => {
    try {
      const response = await api.get('/auth/user-role/');
      setUserRole(response.data.role);
    } catch (err) {
      console.error('Failed to get user role', err);
    }
  };

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assignments/assignments/${id}/`);
      setAssignment(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignment');
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/assignments/assignments/${id}/publish/`);
      toast.success('Assignment published successfully');
      loadAssignment();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/assignments/assignments/${id}/unpublish/`);
      toast.success('Assignment unpublished successfully');
      loadAssignment();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unpublish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      setSubmitting(true);
      await api.delete(`/assignments/assignments/${id}/`);
      toast.success('Assignment deleted successfully');
      navigate('/faculty/assignments');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = async () => {
    try {
      const response = await api.get(`/assignments/assignments/${id}/download_attachment/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignment-${id}-attachment`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to download attachment');
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

  if (!assignment) {
    return <div className="text-gray-600">Assignment not found</div>;
  }

  const isFacultyOrAdmin = userRole === 'FACULTY' || userRole === 'ADMIN';
  const isOverdue = new Date(assignment.deadline) < new Date();
  const daysLeft = Math.ceil((new Date(assignment.deadline) - new Date()) / (1000 * 60 * 60 * 24));

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
        <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
      </div>

      <div className="grid gap-6">
        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            {!assignment.is_published ? (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                Draft
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Published
              </span>
            )}

            {assignment.is_published && (
              <div
                className={`text-xs font-semibold ${
                  isOverdue
                    ? 'text-red-600'
                    : daysLeft <= 2
                    ? 'text-orange-600'
                    : 'text-gray-600'
                }`}
              >
                {isOverdue
                  ? 'Deadline passed'
                  : daysLeft === 0
                  ? 'Due today'
                  : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
              </div>
            )}

            {isFacultyOrAdmin && (
              <div className="flex gap-2 ml-auto">
                <Link
                  to={`/faculty/assignments/${id}/edit`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </Link>
                {!assignment.is_published ? (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Subject</p>
              <p className="text-sm font-medium text-gray-900">{assignment.subject_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Max Marks</p>
              <p className="text-sm font-medium text-gray-900">{assignment.max_marks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Deadline</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(assignment.deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Submissions</p>
              <p className="text-sm font-medium text-gray-900">{assignment.submission_count}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
          </div>

          {/* Instructions */}
          {assignment.instructions && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
            </div>
          )}

          {/* File Attachment */}
          {assignment.file_url && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Attachment</h2>
              <button
                onClick={handleDownloadFile}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
              >
                <Download size={18} />
                Download Attachment
              </button>
            </div>
          )}
        </div>

        {/* Submissions (Faculty only) */}
        {isFacultyOrAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Submissions
              </h2>
              <Link
                to={`/faculty/assignments/${id}/submissions`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase">Total Submissions</p>
                <p className="text-2xl font-bold text-blue-900">{assignment.submission_count}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 font-semibold uppercase">Evaluated</p>
                <p className="text-2xl font-bold text-green-900">{assignment.evaluated_count || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Student Actions */}
        {userRole === 'STUDENT' && assignment.is_published && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <Link
              to={`/student/assignments/${id}/submit`}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <FileText size={18} />
              Submit Assignment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
