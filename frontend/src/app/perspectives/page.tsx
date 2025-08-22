'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/apiClient'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import FiscalYearSelector from '@/components/FiscalYear/FiscalYearSelector'
import { Plus, Edit3, Save, X } from 'lucide-react'

interface Perspective {
  id: string
  fiscalYearId: string
  code: string
  name: string
  description: string
  color: string
  icon?: string
  sequenceOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface FiscalYear {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'locked' | 'archived'
  isCurrent: boolean
  confirmations: Array<{
    confirmationType: string
    confirmedAt: string
  }>
  _count: {
    levelDefinitions: number
    perspectives: number
  }
}

export default function PerspectivesPage() {
  const { user } = useAuth()
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null)
  const [perspectives, setPerspectives] = useState<Perspective[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [mathProblem, setMathProblem] = useState({ question: '', answer: 0 })
  const [userAnswer, setUserAnswer] = useState('')
  const [pendingEdit, setPendingEdit] = useState<{ id: string, data: Partial<Perspective> } | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{ name: string, description: string, color: string } | null>(null)
  const [newPerspective, setNewPerspective] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500'
  })

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'
  ]

  // Get tenant ID for API calls
  const tenantId = user?.tenantId

  const handleFiscalYearChange = (fiscalYear: FiscalYear) => {
    setSelectedFiscalYear(fiscalYear)
    // Check if there's a performance_components confirmation
    const confirmations = fiscalYear?.confirmations || []
    const performanceConfirmation = confirmations.find((c: any) => c.confirmationType === 'performance_components')
    setIsConfirmed(!!performanceConfirmation)
    loadPerspectives(fiscalYear.id)
  }

  // Check if performance components are confirmed for this fiscal year
  const checkConfirmationStatus = async (fiscalYearId: string) => {
    if (!tenantId) return

    try {
      // Check if there's a performance_components confirmation
      const confirmations = selectedFiscalYear?.confirmations || []
      const performanceConfirmation = confirmations.find((c: any) => c.confirmationType === 'performance_components')
      setIsConfirmed(!!performanceConfirmation)
    } catch (error) {
      console.error('Error checking confirmation status:', error)
      setIsConfirmed(false)
    }
  }

  // Load perspectives for the selected fiscal year
  const loadPerspectives = async (fiscalYearId: string) => {
    if (!tenantId) return

    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<{perspectives: Perspective[], total: number}>(`/tenants/${tenantId}/fiscal-years/${fiscalYearId}/perspectives`)
      if (response.success && response.data) {
        setPerspectives(response.data.perspectives || [])
      } else {
        setError('Failed to load perspectives')
      }
    } catch (error) {
      console.error('Error loading perspectives:', error)
      setError('Failed to load perspectives')
    } finally {
      setLoading(false)
    }
  }

  const generateMathProblem = () => {
    const num1 = Math.floor(Math.random() * 20) + 1
    const num2 = Math.floor(Math.random() * 20) + 1
    const operations = ['+', '-', '*']
    const operation = operations[Math.floor(Math.random() * operations.length)]
    
    let answer: number
    let question: string
    
    switch (operation) {
      case '+':
        answer = num1 + num2
        question = `${num1} + ${num2}`
        break
      case '-':
        // Ensure positive result
        const larger = Math.max(num1, num2)
        const smaller = Math.min(num1, num2)
        answer = larger - smaller
        question = `${larger} - ${smaller}`
        break
      case '*':
        // Use smaller numbers for multiplication
        const smallNum1 = Math.floor(Math.random() * 10) + 1
        const smallNum2 = Math.floor(Math.random() * 10) + 1
        answer = smallNum1 * smallNum2
        question = `${smallNum1} × ${smallNum2}`
        break
      default:
        answer = num1 + num2
        question = `${num1} + ${num2}`
    }
    
    return { question, answer }
  }

  const handleAddPerspective = async () => {
    if (!newPerspective.name || !newPerspective.description || !selectedFiscalYear || !tenantId) return
    
    if (!isConfirmed) {
      setError('Cannot add perspectives - performance components must be confirmed first')
      return
    }

    const problem = generateMathProblem()
    setMathProblem(problem)
    setPendingAdd({
      name: newPerspective.name,
      description: newPerspective.description,
      color: newPerspective.color
    })
    setUserAnswer('')
    setShowConfirmation(true)
  }

  const handleEditPerspective = (id: string, updatedPerspective: Partial<Perspective>) => {
    if (!isConfirmed) {
      setError('Cannot edit perspectives - performance components must be confirmed first')
      return
    }

    const problem = generateMathProblem()
    setMathProblem(problem)
    setPendingEdit({ id, data: updatedPerspective })
    setUserAnswer('')
    setShowConfirmation(true)
  }

  const confirmEdit = async () => {
    if (parseInt(userAnswer) !== mathProblem.answer) {
      alert('Incorrect answer. Please try again.')
      setUserAnswer('')
      return
    }

    if (!tenantId || !selectedFiscalYear) return

    try {
      setLoading(true)
      
      if (pendingEdit) {
        // Handle edit operation via API
        const response = await apiClient.put(
          `/tenants/${tenantId}/fiscal-years/${selectedFiscalYear.id}/perspectives/${pendingEdit.id}`,
          pendingEdit.data
        )
        
        if (response.success) {
          // Reload perspectives to get updated data
          await loadPerspectives(selectedFiscalYear.id)
        } else {
          setError(typeof response.error === 'string' ? response.error : (response.error?.message || 'Failed to update perspective'))
          return
        }
        
        setEditingId(null)
        setPendingEdit(null)
      } else if (pendingAdd) {
        // Handle add operation via API
        const response = await apiClient.post(
          `/tenants/${tenantId}/fiscal-years/${selectedFiscalYear.id}/perspectives`,
          pendingAdd
        )
        
        if (response.success) {
          // Reload perspectives to get updated data
          await loadPerspectives(selectedFiscalYear.id)
        } else {
          setError(typeof response.error === 'string' ? response.error : (response.error?.message || 'Failed to create perspective'))
          return
        }
        
        setNewPerspective({ name: '', description: '', color: 'bg-blue-500' })
        setIsAdding(false)
        setPendingAdd(null)
      }
      
      setShowConfirmation(false)
      setUserAnswer('')
    } catch (error) {
      console.error('Error saving perspective:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to save perspective')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Perspectives Management" subtitle="Manage your organizational perspectives based on the Balanced Scorecard framework">
      <div className="space-y-6">
        {/* Fiscal Year Selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fiscal Year Selection</h2>
          </div>
          {tenantId && (
            <FiscalYearSelector
              tenantId={tenantId}
              selectedFiscalYear={selectedFiscalYear}
              onFiscalYearChange={handleFiscalYearChange}
              className="max-w-md"
            />
          )}
        </div>

        {/* Add New Perspective */}
        {selectedFiscalYear && (
          <div className="bg-white rounded-lg shadow p-6">
            {/* Confirmation Status Warning */}
            {!isConfirmed && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-yellow-800 font-medium">Performance components not yet confirmed</span>
                    <p className="text-yellow-700 text-sm mt-1">Perspectives can only be managed after performance components have been confirmed for this fiscal year.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800">{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Perspectives</h2>
              <button
                onClick={() => setIsAdding(true)}
                className={`inline-flex items-center px-4 py-2 text-white rounded-md transition-colors ${
                  !isConfirmed 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={loading || !isConfirmed}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Perspective
              </button>
            </div>

            {/* Add Form */}
            {isAdding && isConfirmed && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Perspective</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newPerspective.name}
                      onChange={(e) => setNewPerspective({ ...newPerspective, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Innovation Perspective"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newPerspective.description}
                      onChange={(e) => setNewPerspective({ ...newPerspective, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What does this perspective measure?"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex space-x-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewPerspective({ ...newPerspective, color })}
                          className={`w-8 h-8 rounded-full ${color} ${newPerspective.color === color ? 'ring-2 ring-gray-400' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4 mr-1 inline" />
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPerspective}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-1 inline" />
                    Add Perspective
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && isConfirmed && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading perspectives...</span>
              </div>
            )}

            {/* Perspectives List */}
            {!loading && isConfirmed && (
              <div className="space-y-4">
                {perspectives.map((perspective) => (
                  <div key={perspective.id} className="border border-gray-200 rounded-lg p-4">
                    {editingId === perspective.id ? (
                      <EditPerspectiveForm
                        perspective={perspective}
                        colors={colors}
                        onSave={(updated) => handleEditPerspective(perspective.id, updated)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full ${perspective.color}`}></div>
                          <div>
                            <h3 className="font-medium text-gray-900">{perspective.name}</h3>
                            <p className="text-sm text-gray-600">{perspective.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => setEditingId(perspective.id)}
                            className={`p-2 transition-colors ${
                              !isConfirmed 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                            disabled={!isConfirmed}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {perspectives.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg mb-2">No perspectives found</div>
                    <p className="text-gray-400">Add your first perspective to get started.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No Fiscal Year Selected Message */}
        {!selectedFiscalYear && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.986-.833-2.756 0L3.058 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-yellow-800">Select a Fiscal Year</h3>
                <p className="text-yellow-700 mt-1">
                  Please select a fiscal year above to view and manage perspectives for that period.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {pendingAdd ? 'Confirm New Perspective' : 'Confirm Changes'}
              </h3>
              <p className="text-gray-600 mb-4">
                To confirm your {pendingAdd ? 'new perspective' : 'changes'}, please solve this simple math problem:
              </p>
              <div className="mb-4">
                <div className="text-2xl font-bold text-center py-4 bg-gray-50 rounded-lg mb-3">
                  {mathProblem.question} = ?
                </div>
                <input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your answer"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false)
                    setPendingEdit(null)
                    setPendingAdd(null)
                    setUserAnswer('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {pendingAdd ? 'Add Perspective' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function EditPerspectiveForm({ 
  perspective, 
  colors, 
  onSave, 
  onCancel 
}: { 
  perspective: Perspective
  colors: string[]
  onSave: (updated: Partial<Perspective>) => void
  onCancel: () => void
}) {
  const [editForm, setEditForm] = useState({
    name: perspective.name,
    description: perspective.description,
    color: perspective.color
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <div className="flex space-x-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setEditForm({ ...editForm, color })}
                className={`w-8 h-8 rounded-full ${color} ${editForm.color === color ? 'ring-2 ring-gray-400' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X className="w-4 h-4 mr-1 inline" />
          Cancel
        </button>
        <button
          onClick={() => onSave(editForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4 mr-1 inline" />
          Save Changes
        </button>
      </div>
    </div>
  )
}