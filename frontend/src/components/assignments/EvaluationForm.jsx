import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Save, Download, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EvaluationForm() {
  const navigate = useNavigate();
  const { id, submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    marks_obtained: 0,
    feedback: '',
    feedback_visible: false,
  });

  useEffect(() => {
    loadData();
  }, [id, submissionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [submissionRes, assignmentRes] = await Promise.all([
        api.get(`/assignments/submissions/${submissionId}/`),
        api.get(`/assignments/assignments/${id}/`),
      ]);
      setSubmission(submissionRes.data);
      setAssignment(assignmentRes.data);

      if (submissionRes.data.status === 'evaluated') {
        setFormData({
          marks_obtained: submissionRes.data.marks_obtained || 0,
          feedback: submissionRes.data.feedback || '',
          feedback_visible: submissionRes.data.feedback_visible || false,
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load submission');
      toast.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(
        `/assignments/submissions/${submissionId}/download_submission/`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission-${submissionId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to download submission');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('marks_obtained', formData.marks_obtained);
      formDataToSend.append('feedback', formData.feedback);
      formDataToSend.append('feedback_visible', formData.feedback_visible);

      await api.post(`/assignments/submissions/${submissionId}/evaluate/`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Submission evaluated successfully');
      // Navigate back and trigger data refresh
      setTimeout(() => {
        navigate(`/faculty/assignments/${id}/submissions`);
      }, 300);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to evaluate submission';
      setError(errorMsg);
      toast.error(errorMsg);
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

  if (error && !submission) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-600" size={20} />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!submission || !assignment) {
    return <div className="text-gray-600">Submission not found</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Evaluate Submission</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Submission Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Details</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Student</p>
              <p className="text-sm font-medium text-gray-900">{submission.student_name}</p>
              <p className="text-xs text-gray-600">{submission.student_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Assignment</p>
              <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Submitted</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Max Marks</p>
              <p className="text-sm font-medium text-gray-900">{assignment.max_marks}</p>
            </div>
          </div>

          {submission.comments && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Student Comments</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {submission.comments}
              </div>
            </div>
          )}
        </div>

        {/* Submission File */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission File</h2>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Download size={18} />
            Download Submission
          </button>
        </div>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Evaluation</h2>

          {/* Marks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Marks Obtained * (out of {assignment.max_marks})
            </label>
            <input
              type="number"
              name="marks_obtained"
              value={formData.marks_obtained}
              onChange={handleInputChange}
              required
              min="0"
              max={assignment.max_marks}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              Range: 0 - {assignment.max_marks}
            </p>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Feedback
            </label>
            <textarea
              name="feedback"
              value={formData.feedback}
              onChange={handleInputChange}
              rows="6"
              placeholder="Provide constructive feedback for the student"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Feedback Visible Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="feedback_visible"
              name="feedback_visible"
              checked={formData.feedback_visible}
              onChange={handleInputChange}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="feedback_visible" className="text-sm font-medium text-gray-700 cursor-pointer">
              Feedback Visible to Student
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
