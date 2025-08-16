'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { User, X, AlertTriangle, Check } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
}

interface EmailTag {
  id: string
  email: string
  isExistingUser: boolean
  userId?: string
  userName?: string
}

interface MultiEmailAutocompleteProps {
  value: EmailTag[]
  onChange: (emails: EmailTag[]) => void
  users: User[]
  allowedDomains: string[]
  placeholder?: string
  className?: string
  maxEmails?: number
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  email: string
}

function ConfirmationDialog({ isOpen, onClose, onConfirm, email }: ConfirmationDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Remove KPI Champion
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove <strong>{email}</strong> as a KPI Champion? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MultiEmailAutocomplete({
  value,
  onChange,
  users,
  allowedDomains,
  placeholder = "Enter emails separated by commas...",
  className = "",
  maxEmails = 10
}: MultiEmailAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [validationMessage, setValidationMessage] = useState<string>('')
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; emailId: string; email: string }>({
    isOpen: false,
    emailId: '',
    email: ''
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Generate unique ID for email tags
  const generateId = () => `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Filter users and validate input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredUsers([])
      setValidationMessage('')
      return
    }

    // Filter existing users (exclude already selected emails)
    const existingEmails = value.map(tag => tag.email.toLowerCase())
    const filtered = users.filter(user => {
      const searchTerm = inputValue.toLowerCase()
      return (
        !existingEmails.includes(user.email.toLowerCase()) &&
        (user.email.toLowerCase().includes(searchTerm) ||
         (user.name && user.name.toLowerCase().includes(searchTerm)))
      )
    })

    setFilteredUsers(filtered)

    // Validate current input
    validateInput(inputValue)
  }, [inputValue, users, value, allowedDomains])

  const validateEmail = (email: string): { isValid: boolean; message: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Invalid email format' }
    }

    // Check if already added
    if (value.some(tag => tag.email.toLowerCase() === email.toLowerCase())) {
      return { isValid: false, message: 'Email already added' }
    }

    // Check domain restrictions
    if (allowedDomains.length > 0) {
      const domain = email.split('@')[1]
      if (!allowedDomains.includes(domain)) {
        return { 
          isValid: false, 
          message: `Domain "${domain}" not allowed. Allowed: ${allowedDomains.join(', ')}` 
        }
      }
    }

    return { isValid: true, message: 'Valid email' }
  }

  const validateInput = (input: string) => {
    // Check if input looks like an email
    if (input.includes('@')) {
      const validation = validateEmail(input.trim())
      setValidationMessage(validation.message)
    } else if (input.trim()) {
      setValidationMessage('Type an email address or search for users')
    } else {
      setValidationMessage('')
    }
  }

  const addEmail = (email: string, existingUser?: User) => {
    const validation = validateEmail(email)
    if (!validation.isValid) {
      setValidationMessage(validation.message)
      return false
    }

    if (value.length >= maxEmails) {
      setValidationMessage(`Maximum ${maxEmails} emails allowed`)
      return false
    }

    const newTag: EmailTag = {
      id: generateId(),
      email: email.toLowerCase(),
      isExistingUser: !!existingUser,
      userId: existingUser?.id,
      userName: existingUser?.name || undefined
    }

    onChange([...value, newTag])
    return true
  }

  const removeEmail = (emailId: string) => {
    const emailToRemove = value.find(tag => tag.id === emailId)
    if (!emailToRemove) return

    setConfirmDialog({
      isOpen: true,
      emailId,
      email: emailToRemove.email
    })
  }

  const confirmRemoval = () => {
    onChange(value.filter(tag => tag.id !== confirmDialog.emailId))
    setConfirmDialog({ isOpen: false, emailId: '', email: '' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      const email = inputValue.trim()
      
      if (email) {
        // Check if it matches an existing user
        const matchingUser = users.find(user => 
          user.email.toLowerCase() === email.toLowerCase()
        )

        if (addEmail(email, matchingUser)) {
          setInputValue('')
          setValidationMessage('')
          setIsOpen(false)
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last email when backspace is pressed on empty input
      const lastEmail = value[value.length - 1]
      removeEmail(lastEmail.id)
    }
  }

  const handleSelectUser = (user: User) => {
    if (addEmail(user.email, user)) {
      setInputValue('')
      setValidationMessage('')
      setIsOpen(false)
    }
  }

  const handleInputBlur = () => {
    // Add email if valid when input loses focus
    setTimeout(() => {
      const email = inputValue.trim()
      if (email && email.includes('@')) {
        const matchingUser = users.find(user => 
          user.email.toLowerCase() === email.toLowerCase()
        )
        if (addEmail(email, matchingUser)) {
          setInputValue('')
          setValidationMessage('')
        }
      }
      setIsOpen(false)
    }, 200)
  }

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Email Tags */}
        {value.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-2">
              {value.map((tag) => (
                <div
                  key={tag.id}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    tag.isExistingUser
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    {tag.isExistingUser ? (
                      <User className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span className="font-medium">
                      {tag.userName || tag.email}
                    </span>
                    {tag.userName && (
                      <span className="text-xs opacity-75">({tag.email})</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeEmail(tag.id)}
                    className="ml-2 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {value.length >= maxEmails && (
              <p className="text-xs text-orange-600 mt-1">
                Maximum {maxEmails} emails reached
              </p>
            )}
          </div>
        )}

        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onBlur={handleInputBlur}
            placeholder={value.length >= maxEmails ? `Maximum ${maxEmails} emails reached` : placeholder}
            disabled={value.length >= maxEmails}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Validation Message */}
        {validationMessage && (
          <div className={`mt-1 text-xs flex items-center space-x-1 ${
            validationMessage.includes('Valid') || validationMessage.includes('search')
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {validationMessage.includes('Valid') ? (
              <Check className="w-3 h-3" />
            ) : validationMessage.includes('search') ? (
              <User className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{validationMessage}</span>
          </div>
        )}

        {/* Dropdown */}
        {isOpen && inputValue && (filteredUsers.length > 0 || inputValue.includes('@')) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Existing Users */}
            {filteredUsers.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Existing Users
                </div>
                {filteredUsers.slice(0, 5).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.name || user.email}
                      </div>
                      {user.name && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Add Custom Email */}
            {inputValue.includes('@') && validateEmail(inputValue.trim()).isValid && (
              <div>
                {filteredUsers.length > 0 && <div className="border-t border-gray-100"></div>}
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Add New Email
                </div>
                <button
                  onClick={() => {
                    if (addEmail(inputValue.trim())) {
                      setInputValue('')
                      setIsOpen(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                >
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{inputValue.trim()}</div>
                    <div className="text-xs text-gray-500">Add as new KPI Champion</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, emailId: '', email: '' })}
        onConfirm={confirmRemoval}
        email={confirmDialog.email}
      />
    </>
  )
}
