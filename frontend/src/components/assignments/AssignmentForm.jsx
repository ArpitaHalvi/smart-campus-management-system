import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    subject_name: '',
    max_marks: 10,
    deadline: '',
    semester: '',
    section: '',
    file_url: null,
  });

  useEffect(() => {
    fetchSemestersAndSections();
    if (id) {
      loadAssignment();
    }
  }, [id]);

  const fetchSemestersAndSections = async () => {
    try {
      const [semesterRes, sectionRes] = await Promise.all([
        api.get('/academics/semesters/'),
        api.get('/academics/sections/'),
      ]);
      setSemesters(semesterRes.data.results || semesterRes.data);
      setSections(sectionRes.data.results || sectionRes.data);
    } catch (err) {
      console.error('Failed to load semesters/sections', err);
    }
  };

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assignments/assignments/${id}/`);
      setFormData({
        title: response.data.title,
        description: response.data.description,
        instructions: response.data.instructions || '',
        subject_name: response.data.subject_name,
        max_marks: response.data.max_marks,
        deadline: response.data.deadline,
        semester: response.data.semester,
        section: response.data.section,
        file_url: response.data.file_url,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignment');
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Only PDF, DOC, DOCX, TXT, and ZIP files are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate required fields
    if (!formData.semester || !formData.section) {
      setError('Please select both semester and section');
      setSubmitting(false);
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('instructions', formData.instructions);
      formDataObj.append('subject_name', formData.subject_name);
      formDataObj.append('max_marks', formData.max_marks);
      formDataObj.append('deadline', formData.deadline);
      formDataObj.append('semester', formData.semester);
      formDataObj.append('section', formData.section);

      if (file) {
        formDataObj.append('attachment', file);
      }

      if (id) {
        await api.patch(`/assignments/assignments/${id}/`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Assignment updated successfully');
      } else {
        await api.post('/assignments/assignments/', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Assignment created successfully');
      }

      navigate('/faculty/assignments');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data || 'Failed to save assignment';
      setError(JSON.stringify(errorMsg));
      toast.error(errorMsg.semester?.[0] || errorMsg.section?.[0] || errorMsg);
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

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Edit Assignment' : 'Create Assignment'}
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
            placeholder="Enter assignment title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Subject *
          </label>
          <input
            type="text"
            name="subject_name"
            value={formData.subject_name}
            onChange={handleInputChange}
            required
            placeholder="Enter subject name or code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Semester */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Semester *
          </label>
          <select
            name="semester"
            value={formData.semester}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Semester</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Section *
          </label>
          <select
            name="section"
            value={formData.section}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Section</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
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
            placeholder="Provide a detailed description of the assignment"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Instructions
          </label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            rows="4"
            placeholder="Provide submission guidelines and instructions"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Max Marks */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Maximum Marks *
          </label>
          <input
            type="number"
            name="max_marks"
            value={formData.max_marks}
            onChange={handleInputChange}
            required
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Deadline *
          </label>
          <input
            type="datetime-local"
            name="deadline"
            value={formData.deadline}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* File Attachment */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Attachment (Optional)
          </label>
          <p className="text-xs text-gray-600 mb-2">Allowed: PDF, DOC, DOCX, TXT, ZIP (Max 10MB)</p>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {file && <p className="mt-2 text-sm text-green-600">Selected: {file.name}</p>}
          {formData.file_url && !file && (
            <p className="mt-2 text-sm text-blue-600">Current file attached</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {submitting ? 'Saving...' : 'Save Assignment'}
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
