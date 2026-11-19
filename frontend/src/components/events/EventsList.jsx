import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Plus, Calendar, MapPin, Users, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function EventsList() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 3 || search.length === 0) {
        fetchEvents();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filter]);

  useEffect(() => {
    getUserRole();
    fetchEvents();
  }, []);

  // Refetch events when component comes into focus (e.g., after returning from detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchEvents();
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let endpoint = '/events/events/';
      const params = {};

      if (filter === 'upcoming') {
        endpoint = '/events/events/upcoming/';
      } else if (filter === 'past') {
        endpoint = '/events/events/past/';
      }

      if (search) params.search = search;

      const response = await api.get(endpoint, { params });
      setEvents(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load events');
      toast.error('Failed to load events');
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

  const isUpcoming = (startDate) => {
    return new Date(startDate) > new Date();
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
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        {(userRole === 'FACULTY' || userRole === 'ADMIN') && (
          <Link
            to="/faculty/events/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={18} />
            New Event
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search events... (minimum 3 characters)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Events</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events</h3>
          <p className="text-gray-600">
            {search ? 'No events match your search' : 'No events available yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const upcoming = isUpcoming(event.start_datetime);

            return (
              <Link
                key={event.id}
                to={
                  user?.role === 'STUDENT'
                    ? `/student/events/${event.id}`
                    : `/faculty/events/${event.id}`
                }
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{formatDate(event.start_datetime)}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{event.venue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{event.current_participants || 0} registered</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      {!event.is_published ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          Draft
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Published
                        </span>
                      )}

                      {upcoming ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          Upcoming
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                          Past
                        </span>
                      )}
                    </div>

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
