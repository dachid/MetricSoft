'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Calculator, Save } from 'lucide-react';

interface SaveConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isLoading?: boolean;
}

export default function SaveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Configuration Save",
  message = "Saving the organizational structure will lock in the hierarchy levels. This is a significant change that affects how your organization is structured.",
  isLoading = false
}: SaveConfirmationDialogProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [showError, setShowError] = useState(false);

  // Generate new math challenge when dialog opens
  useEffect(() => {
    if (isOpen) {
      setNum1(Math.floor(Math.random() * 20) + 1);
      setNum2(Math.floor(Math.random() * 20) + 1);
      setUserAnswer('');
      setIsCorrect(false);
      setShowError(false);
    }
  }, [isOpen]);

  // Check answer as user types
  useEffect(() => {
    if (userAnswer) {
      const correct = parseInt(userAnswer) === (num1 + num2);
      setIsCorrect(correct);
      setShowError(!correct && userAnswer.length > 0);
    } else {
      setIsCorrect(false);
      setShowError(false);
    }
  }, [userAnswer, num1, num2]);

  const handleConfirm = () => {
    if (isCorrect) {
      onConfirm();
    } else {
      setShowError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Math Challenge */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Security Challenge
              </span>
            </div>
            <div className="space-y-3">
              <div className="text-lg font-mono text-center bg-white p-3 rounded border">
                {num1} + {num2} = ?
              </div>
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter the answer"
                className={`w-full px-3 py-2 border rounded-md text-center font-mono text-lg focus:outline-none focus:ring-2 ${
                  showError
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : isCorrect
                    ? 'border-green-300 focus:ring-green-500 bg-green-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={isLoading}
                autoFocus
              />
              {showError && (
                <p className="text-sm text-red-600 text-center">
                  Incorrect answer. Please try again.
                </p>
              )}
              {isCorrect && (
                <p className="text-sm text-green-600 text-center">
                  ✓ Correct! You can now proceed.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isCorrect || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
