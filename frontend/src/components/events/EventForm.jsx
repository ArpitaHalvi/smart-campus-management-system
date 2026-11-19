import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    start_datetime: '',
    end_datetime: '',
    registration_deadline: '',
    max_participants: '',
    organizing_department: '',
  });

  useEffect(() => {
    fetchDepartments();
    if (id) {
      loadEvent();
    }
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/academics/departments/');
      setDepartments(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/events/${id}/`);
      
      // Convert ISO datetime strings to datetime-local format (YYYY-MM-DDTHH:mm)
      const toDatetimeLocal = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toISOString().slice(0, 16);
      };
      
      setFormData({
        title: response.data.title,
        description: response.data.description,
        venue: response.data.venue || '',
        start_datetime: toDatetimeLocal(response.data.start_datetime),
        end_datetime: toDatetimeLocal(response.data.end_datetime),
        registration_deadline: toDatetimeLocal(response.data.registration_deadline) || '',
        max_participants: response.data.max_participants || '',
        organizing_department: response.data.organizing_department || '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load event');
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Frontend Validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      // Convert to FormData for multipart submission
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('venue', formData.venue);
      submitData.append('start_datetime', formData.start_datetime);
      submitData.append('end_datetime', formData.end_datetime);
      submitData.append('registration_deadline', formData.registration_deadline); // Now required
      if (formData.max_participants) submitData.append('max_participants', formData.max_participants);
      if (formData.organizing_department) submitData.append('organizing_department', formData.organizing_department);

      if (id) {
        await api.patch(`/events/events/${id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Event updated successfully');
      } else {
        await api.post('/events/events/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Event created successfully');
      }

      navigate('/faculty/events');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data || 'Failed to save event';
      setError(JSON.stringify(errorMsg));
      toast.error(errorMsg?.title?.[0] || errorMsg?.start_datetime?.[0] || errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.title || !formData.description || !formData.venue || !formData.start_datetime || !formData.end_datetime || !formData.registration_deadline) {
      return 'All required fields must be filled.';
    }

    // Check end time after start time
    const startTime = new Date(formData.start_datetime);
    const endTime = new Date(formData.end_datetime);
    if (endTime <= startTime) {
      return 'End date/time must be after start date/time.';
    }

    // Check registration deadline before event start
    const regDeadline = new Date(formData.registration_deadline);
    if (regDeadline >= startTime) {
      return 'Registration deadline must be before event start date/time.';
    }

    // Check max participants is positive if provided
    if (formData.max_participants && parseInt(formData.max_participants) <= 0) {
      return 'Maximum participants must be greater than 0.';
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
          {id ? 'Edit Event' : 'Create Event'}
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
            Event Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Enter event title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="Provide a detailed description of the event"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Location/Venue */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Venue *
          </label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            required
            placeholder="Enter event venue/location"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Department (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Department (Optional)
          </label>
          <select
            name="organizing_department"
            value={formData.organizing_department}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Department (Leave empty for all)</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date/Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date/Time *
            </label>
            <input
              type="datetime-local"
              name="start_datetime"
              value={formData.start_datetime}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Date/Time *
            </label>
            <input
              type="datetime-local"
              name="end_datetime"
              value={formData.end_datetime}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Registration Deadline */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Registration Deadline *
          </label>
          <input
            type="datetime-local"
            name="registration_deadline"
            value={formData.registration_deadline}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Max Participants */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Max Participants (Optional)
          </label>
          <input
            type="number"
            name="max_participants"
            value={formData.max_participants}
            onChange={handleInputChange}
            min="0"
            placeholder="Maximum attendees (leave blank for unlimited)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {submitting ? 'Saving...' : 'Save Event'}
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
