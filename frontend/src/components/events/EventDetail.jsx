import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Edit2, Trash2, ArrowLeft, Calendar, MapPin, Users, LogIn, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    loadEvent();
    getUserRole();
    checkRegistration();
  }, [id]);

  const getUserRole = async () => {
    try {
      const response = await api.get('/auth/user-role/');
      setUserRole(response.data.role);
    } catch (err) {
      console.error('Failed to get user role', err);
    }
  };

  const checkRegistration = async () => {
    try {
      const response = await api.get('/events/registrations/my_registrations/');
      const myRegistration = response.data.results?.find((r) => r.event_id === parseInt(id)) || response.data.find((r) => r.event_id === parseInt(id));
      setIsRegistered(!!myRegistration);
    } catch (err) {
      console.error('Failed to check registration status');
    }
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/events/${id}/`);
      setEvent(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load event');
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/events/events/${id}/publish/`);
      toast.success('Event published successfully');
      loadEvent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setSubmitting(true);
      await api.post(`/events/events/${id}/unpublish/`);
      toast.success('Event unpublished successfully');
      loadEvent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unpublish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setSubmitting(true);
      await api.delete(`/events/events/${id}/`);
      toast.success('Event deleted successfully');
      navigate('/faculty/events');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    try {
      setSubmitting(true);
      await api.post('/events/registrations/', { event_id: id });
      toast.success('Registered for event successfully');
      setIsRegistered(true);
      loadEvent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      setSubmitting(true);
      const response = await api.get('/events/registrations/my_registrations/');
      const myRegistration = response.data.results?.find((r) => r.event_id === parseInt(id)) || response.data.find((r) => r.event_id === parseInt(id));
      if (myRegistration) {
        await api.post(`/events/registrations/${myRegistration.id}/cancel/`);
        toast.success('Registration cancelled');
        setIsRegistered(false);
        loadEvent();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel registration');
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

  if (!event) {
    return <div className="text-gray-600">Event not found</div>;
  }

  const isFacultyOrAdmin = userRole === 'FACULTY' || userRole === 'ADMIN';
  const isUpcoming = new Date(event.start_date) > new Date();
  const isFull = event.capacity && event.registration_count >= event.capacity;

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
        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
      </div>

      <div className="grid gap-6">
        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            {!event.is_published ? (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                Draft
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Published
              </span>
            )}

            {isUpcoming ? (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                Upcoming
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                Past
              </span>
            )}

            {isFacultyOrAdmin && (
              <div className="flex gap-2 ml-auto">
                <Link
                  to={`/faculty/events/${id}/edit`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </Link>
                {!event.is_published ? (
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

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{event.description}</p>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-t border-gray-200 pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">Start Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">End Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(event.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="text-blue-600 mt-1" size={20} />
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase">Location</p>
                  <p className="text-sm font-medium text-gray-900">{event.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Registration Info */}
          {event.registration_enabled && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={16} />
              <span>
                {event.registration_count} registered
                {event.capacity && ` out of ${event.capacity}`}
              </span>
            </div>
          )}
        </div>

        {/* Faculty Actions */}
        {isFacultyOrAdmin && event.is_published && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrations</h2>
            <Link
              to={`/faculty/events/${id}/registrations`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Users size={18} />
              View All Registrations
            </Link>
          </div>
        )}

        {/* Student Actions */}
        {userRole === 'STUDENT' && event.is_published && event.registration_enabled && isUpcoming && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            {isRegistered ? (
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <LogOut size={18} />
                {submitting ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            ) : (
              <button
                onClick={handleRegister}
                disabled={submitting || isFull}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <LogIn size={18} />
                {submitting ? 'Registering...' : isFull ? 'Event Full' : 'Register for Event'}
              </button>
            )}
            {isFull && <p className="text-sm text-blue-700 mt-2">This event has reached its capacity.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
