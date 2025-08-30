import React, { useState } from 'react';
import type { WasteHotspot } from '../types';

interface HotspotSubmissionFormProps {
  onSubmit: (hotspot: Omit<WasteHotspot, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
  defaultLocation?: { lat: number; lng: number };
}

const HotspotSubmissionForm: React.FC<HotspotSubmissionFormProps> = ({
  onSubmit,
  onCancel,
  defaultLocation
}) => {
  const [formData, setFormData] = useState({
    lat: defaultLocation?.lat || 37.7749,
    lng: defaultLocation?.lng || -122.4194,
    severity: 5,
    description: '',
    wasteType: 'general',
    reporterName: '',
    reporterEmail: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const wasteTypes = [
    { value: 'general', label: 'General Waste' },
    { value: 'plastic', label: 'Plastic Waste' },
    { value: 'organic', label: 'Organic Waste' },
    { value: 'electronic', label: 'Electronic Waste' },
    { value: 'hazardous', label: 'Hazardous Waste' },
    { value: 'construction', label: 'Construction Debris' },
    { value: 'textile', label: 'Textile Waste' },
    { value: 'other', label: 'Other' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.lat || formData.lat < -90 || formData.lat > 90) {
      newErrors.lat = 'Latitude must be between -90 and 90';
    }
    if (!formData.lng || formData.lng < -180 || formData.lng > 180) {
      newErrors.lng = 'Longitude must be between -180 and 180';
    }
    if (!formData.severity || formData.severity < 1 || formData.severity > 10) {
      newErrors.severity = 'Severity must be between 1 and 10';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.reporterName.trim()) {
      newErrors.reporterName = 'Reporter name is required';
    }
    if (!formData.reporterEmail.trim()) {
      newErrors.reporterEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporterEmail)) {
      newErrors.reporterEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit({
        lat: formData.lat,
        lng: formData.lng,
        severity: formData.severity
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'text-red-600';
    if (severity >= 6) return 'text-orange-600';
    if (severity >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Report New Waste Hotspot</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => handleInputChange('lat', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lat ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="37.7749"
                  />
                  {errors.lat && <p className="mt-1 text-sm text-red-600">{errors.lat}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => handleInputChange('lng', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lng ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="-122.4194"
                  />
                  {errors.lng && <p className="mt-1 text-sm text-red-600">{errors.lng}</p>}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                💡 Tip: Click on the map to automatically fill coordinates
              </p>
            </div>

            {/* Waste Details Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level * <span className={`font-bold ${getSeverityColor(formData.severity)}`}>({formData.severity}/10)</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.severity}
                      onChange={(e) => handleInputChange('severity', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className={`font-bold text-lg ${getSeverityColor(formData.severity)}`}>
                      {formData.severity}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low (1-3)</span>
                    <span>Medium (4-7)</span>
                    <span>High (8-10)</span>
                  </div>
                  {errors.severity && <p className="mt-1 text-sm text-red-600">{errors.severity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waste Type
                  </label>
                  <select
                    value={formData.wasteType}
                    onChange={(e) => handleInputChange('wasteType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {wasteTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe the waste accumulation, approximate size, and any relevant details..."
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>
              </div>
            </div>

            {/* Reporter Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reporter Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={formData.reporterName}
                    onChange={(e) => handleInputChange('reporterName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.reporterName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.reporterName && <p className="mt-1 text-sm text-red-600">{errors.reporterName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.reporterEmail}
                    onChange={(e) => handleInputChange('reporterEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.reporterEmail ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.reporterEmail && <p className="mt-1 text-sm text-red-600">{errors.reporterEmail}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HotspotSubmissionForm;
