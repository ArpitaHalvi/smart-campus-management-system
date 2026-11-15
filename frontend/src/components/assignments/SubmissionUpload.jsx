import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubmissionUpload() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [comments, setComments] = useState('');
  const [existingSubmission, setExistingSubmission] = useState(null);

  useEffect(() => {
    loadAssignment();
    loadExistingSubmission();
  }, [id]);

  const loadAssignment = async () => {
    try {
      const response = await api.get(`/assignments/assignments/${id}/`);
      setAssignment(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignment');
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSubmission = async () => {
    try {
      const response = await api.get('/assignments/submissions/my_submissions/');
      const mySubmission = response.data.results?.find((s) => s.assignment_id === parseInt(id)) || response.data.find((s) => s.assignment_id === parseInt(id));
      if (mySubmission) {
        setExistingSubmission(mySubmission);
      }
    } catch (err) {
      console.error('Failed to load existing submission');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'text/plain', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Only PDF, DOC, DOCX, TXT, ZIP, and image files are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file to submit');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('assignment', id);  // Changed from 'assignment_id' to 'assignment'
      formData.append('submission_file', file);
      if (comments) {
        formData.append('comments', comments);
      }

      if (existingSubmission) {
        await api.patch(`/assignments/submissions/${existingSubmission.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Submission updated successfully');
      } else {
        await api.post('/assignments/submissions/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Submission uploaded successfully');
      }

      navigate(`/student/assignments/${id}`);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to submit assignment';
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

  if (error && !assignment) {
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

  const isOverdue = new Date(assignment.deadline) < new Date();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Submit Assignment</h1>
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Assignment Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h2>
          <p className="text-sm text-gray-600">
            Deadline:{' '}
            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
              {new Date(assignment.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {isOverdue && ' (OVERDUE)'}
            </span>
          </p>
        </div>

        {/* Existing Submission Alert */}
        {existingSubmission && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> You have already submitted this assignment. Uploading a new file will replace your previous submission.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Last submitted: {new Date(existingSubmission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> The deadline for this assignment has passed. Late submissions may incur penalties.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Upload Your Assignment *
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Allowed: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG (Max 10MB)
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-sm font-medium text-gray-700">
                {file ? `Selected: ${file.name}` : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {file ? file.name : 'Choose a file from your computer'}
              </p>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows="4"
              placeholder="Add any comments about your submission..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || !file}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {submitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
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
