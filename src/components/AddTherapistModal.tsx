'use client';

import { useState } from 'react';
import { X, User, MessageSquare, Palette, Volume2 } from 'lucide-react';
import type { TherapistStyle } from '@/lib/types';

interface AddTherapistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (therapist: TherapistStyle) => void;
}

const EMOJI_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍🏫', '👩‍🏫', '🧑‍💻', '👨‍⚕️', '👩‍⚕️', '🤵', '👸', '🎭', '📊', '💡', '🚀', '⭐', '🎯', '💎'];
const COLOR_OPTIONS = ['therapy-custom-blue', 'therapy-custom-green', 'therapy-custom-purple', 'therapy-custom-orange', 'therapy-custom-red', 'therapy-custom-pink'];

export default function AddTherapistModal({ isOpen, onClose, onSave }: AddTherapistModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    icon: '👨‍💼',
    color: 'therapy-custom-blue'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.tagline.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newTherapist: TherapistStyle = {
      id: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: formData.name.trim(),
      tagline: formData.tagline.trim(),
      icon: formData.icon,
      color: formData.color
    };

    onSave(newTherapist);
    
    // Reset form
    setFormData({
      name: '',
      tagline: '',
      icon: '👨‍💼',
      color: 'therapy-custom-blue'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5" />
            Create New Therapist
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Therapist Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Dr. Sarah Johnson"
              required
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline *
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Behavioral finance expert"
              required
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-gray-50 ${
                    formData.icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-200'
                  }`}
                  style={{
                    backgroundColor: color === 'therapy-custom-blue' ? '#3B82F6' :
                                   color === 'therapy-custom-green' ? '#10B981' :
                                   color === 'therapy-custom-purple' ? '#8B5CF6' :
                                   color === 'therapy-custom-orange' ? '#F97316' :
                                   color === 'therapy-custom-red' ? '#EF4444' :
                                   color === 'therapy-custom-pink' ? '#EC4899' : '#3B82F6'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">Preview:</p>
            <div className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 bg-white max-w-[120px] mx-auto">
              <span className="text-2xl mb-2">{formData.icon}</span>
              <p className="font-semibold text-xs text-center mb-1 text-gray-800">
                {formData.name || 'Your Name'}
              </p>
              <p className="text-xs text-center leading-tight text-gray-600">
                {formData.tagline || 'Your tagline'}
              </p>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <Volume2 className="w-4 h-4 inline mr-1" />
              Note: Custom therapists will use the default voice. Full personality and conversation features coming soon!
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Therapist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}