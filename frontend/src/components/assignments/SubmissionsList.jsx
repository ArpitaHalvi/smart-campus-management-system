import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Eye, FileText, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubmissionsList() {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const fetchSubmissions = async () => {
    try {
      setRefreshing(true);
      const response = await api.get(`/assignments/assignments/${id}/submissions/`);
      setSubmissions(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load submissions');
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchSubmissions();
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{submissions.length}</span>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
          <p className="text-gray-600">Submissions will appear here once students submit their assignments.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Submitted At
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Marks
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.student_name || 'Anonymous'}
                    </div>
                    <div className="text-xs text-gray-500">{submission.student_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(submission.submitted_at)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {submission.status === 'evaluated' ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        <CheckCircle size={14} />
                        Evaluated
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        <Clock size={14} />
                        {submission.status || 'Pending'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {submission.status === 'evaluated' && submission.marks_obtained !== null ? (
                      <span className="text-sm font-semibold text-gray-900">
                        {submission.marks_obtained}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {submission.status !== 'evaluated' ? (
                      <Link
                        to={`/faculty/assignments/${id}/submissions/${submission.id}/evaluate`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <Eye size={16} />
                        Evaluate
                      </Link>
                    ) : (
                      <Link
                        to={`/faculty/assignments/${id}/submissions/${submission.id}/evaluate`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        <Eye size={16} />
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
