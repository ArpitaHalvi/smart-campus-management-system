import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, ArrowLeft, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventRegistrations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, [id]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/events/${id}/registrations/`);
      setRegistrations(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load registrations');
      toast.error('Failed to load registrations');
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Event Registrations</h1>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Users className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Registrations</h3>
          <p className="text-gray-600">No one has registered for this event yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Registered At
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {reg.student_name || 'Anonymous'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {reg.student_email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(reg.registered_at)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {reg.is_cancelled ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Registered
                      </span>
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
