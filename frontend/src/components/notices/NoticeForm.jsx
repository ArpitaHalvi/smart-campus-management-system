import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NoticeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    audience_type: 'ALL',
    department: '',
    semester: '',
    section: '',
  });

  useEffect(() => {
    if (id) {
      loadNotice();
    }
  }, [id]);

  const loadNotice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/notices/notices/${id}/`);
      setFormData({
        title: response.data.title,
        content: response.data.content,
        category: response.data.category || '',
        audience_type: response.data.audience_type || 'ALL',
        department: response.data.department || '',
        semester: response.data.semester || '',
        section: response.data.section || '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notice');
      toast.error('Failed to load notice');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      // Build audience_data array
      const audienceData = [];
      
      if (formData.audience_type === 'ALL') {
        audienceData.push({ audience_type: 'ALL' });
      } else if (formData.audience_type === 'DEPT' && formData.department) {
        audienceData.push({ 
          audience_type: 'DEPARTMENT',
          department: formData.department 
        });
      } else if (formData.audience_type === 'SEMESTER' && formData.semester) {
        audienceData.push({ 
          audience_type: 'SEMESTER',
          semester: formData.semester 
        });
      } else if (formData.audience_type === 'SECTION' && formData.section) {
        audienceData.push({ 
          audience_type: 'SECTION',
          section: formData.section 
        });
      }

      // Convert to FormData for multipart submission
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('audience_data', JSON.stringify(audienceData));
      if (formData.description) formDataToSend.append('description', formData.description);

      if (id) {
        await api.patch(`/notices/notices/${id}/`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Notice updated successfully');
      } else {
        await api.post('/notices/notices/', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Notice created successfully');
      }

      navigate('/faculty/notices');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data || 'Failed to save notice';
      setError(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Failed to save notice');
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.title || !formData.content) {
      return 'All required fields must be filled.';
    }

    // Check audience-specific fields
    if (formData.audience_type === 'DEPT' && !formData.department) {
      return 'Please select a department for this notice.';
    }
    if (formData.audience_type === 'SEMESTER' && !formData.semester) {
      return 'Please select a semester for this notice.';
    }
    if (formData.audience_type === 'SECTION' && !formData.section) {
      return 'Please select a section for this notice.';
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Edit Notice' : 'Create Notice'}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Enter notice title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Content *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            required
            rows="6"
            placeholder="Write your notice content here"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="GENERAL">General</option>
            <option value="ACADEMIC">Academic</option>
            <option value="EXAMINATION">Examination</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="EVENTS">Events</option>
            <option value="ADMINISTRATIVE">Administrative</option>
          </select>
        </div>

        {/* Audience Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Audience *
          </label>
          <select
            name="audience_type"
            value={formData.audience_type}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Users</option>
            <option value="DEPT">Specific Department</option>
            <option value="SEMESTER">Specific Semester</option>
            <option value="SECTION">Specific Section</option>
            <option value="USER">Specific User</option>
          </select>
        </div>

        {/* Conditional Fields */}
        {formData.audience_type === 'DEPT' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              placeholder="Enter department name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {formData.audience_type === 'SEMESTER' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Semester
            </label>
            <input
              type="text"
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              placeholder="Enter semester"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {formData.audience_type === 'SECTION' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Section
            </label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleInputChange}
              placeholder="Enter section"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {submitting ? 'Saving...' : 'Save Notice'}
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
  );
}
