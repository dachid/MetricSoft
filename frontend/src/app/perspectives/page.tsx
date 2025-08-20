'use client'

import { useState } from 'react'

export default function PerspectivesPage() {
  const [selectedPerspective, setSelectedPerspective] = useState<string>('')

  const perspectives = [
    { id: 'customer', name: 'Customer Perspective', description: 'How do customers see us?' },
    { id: 'financial', name: 'Financial Perspective', description: 'How do we look to shareholders?' },
    { id: 'internal', name: 'Internal Business Process', description: 'What must we excel at?' },
    { id: 'learning', name: 'Learning & Growth', description: 'Can we continue to improve and create value?' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Performance Perspectives
        </h1>
        <p className="text-gray-600">
          Manage and configure your organizational performance perspectives based on the Balanced Scorecard framework.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {perspectives.map((perspective) => (
          <div
            key={perspective.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
            onClick={() => setSelectedPerspective(perspective.id)}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {perspective.name}
            </h3>
            <p className="text-gray-600 mb-4">
              {perspective.description}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Click to configure
              </span>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedPerspective && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">
            Configure {perspectives.find(p => p.id === selectedPerspective)?.name}
          </h4>
          <p className="text-blue-700 mb-4">
            Perspective configuration features will be available in the next phase of development.
          </p>
          <button
            onClick={() => setSelectedPerspective('')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}