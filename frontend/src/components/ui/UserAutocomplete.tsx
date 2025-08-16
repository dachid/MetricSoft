'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Check, X } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
}

interface UserAutocompleteProps {
  value: string | null // userId or email
  onChange: (userId: string | null, email?: string) => void
  users: User[]
  allowedDomains: string[]
  placeholder?: string
  className?: string
}

export default function UserAutocomplete({
  value,
  onChange,
  users,
  allowedDomains,
  placeholder = "Search users or enter email...",
  className = ""
}: UserAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize input value based on current selection
  useEffect(() => {
    if (value) {
      const existingUser = users.find(user => user.id === value)
      if (existingUser) {
        setInputValue(existingUser.name || existingUser.email)
      } else {
        // It's a custom email
        setInputValue(value)
      }
    } else {
      setInputValue('')
    }
  }, [value, users])

  // Filter users and validate email as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredUsers([])
      setEmailValidation(null)
      return
    }

    // Filter existing users
    const filtered = users.filter(user => {
      const searchTerm = inputValue.toLowerCase()
      return (
        user.email.toLowerCase().includes(searchTerm) ||
        (user.name && user.name.toLowerCase().includes(searchTerm))
      )
    })

    setFilteredUsers(filtered)

    // Validate email if it looks like an email address
    if (inputValue.includes('@')) {
      validateEmail(inputValue)
    } else {
      setEmailValidation(null)
    }
  }, [inputValue, users, allowedDomains])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      setEmailValidation({ isValid: false, message: 'Invalid email format' })
      return
    }

    if (allowedDomains.length > 0) {
      const domain = email.split('@')[1]
      if (!allowedDomains.includes(domain)) {
        setEmailValidation({ 
          isValid: false, 
          message: `Domain "${domain}" is not allowed. Allowed domains: ${allowedDomains.join(', ')}` 
        })
        return
      }
    }

    setEmailValidation({ isValid: true, message: 'Valid email address' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
  }

  const handleSelectUser = (user: User) => {
    setInputValue(user.name || user.email)
    setIsOpen(false)
    setEmailValidation(null)
    onChange(user.id)
  }

  const handleSelectEmail = (email: string) => {
    setInputValue(email)
    setIsOpen(false)
    setEmailValidation(null)
    onChange(null, email) // null userId indicates it's a custom email
  }

  const handleInputBlur = () => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => {
      setIsOpen(false)
      
      // If user typed an email that's valid but not in the existing users, use it
      if (inputValue.includes('@') && emailValidation?.isValid) {
        const existingUser = users.find(user => user.email.toLowerCase() === inputValue.toLowerCase())
        if (!existingUser) {
          handleSelectEmail(inputValue)
        }
      } else if (!inputValue.trim()) {
        // Clear selection if input is empty
        onChange(null)
      }
    }, 200)
  }

  const handleClear = () => {
    setInputValue('')
    setEmailValidation(null)
    onChange(null)
    inputRef.current?.focus()
  }

  // Click outside to close
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
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Email validation feedback */}
      {emailValidation && (
        <div className={`mt-1 text-xs flex items-center space-x-1 ${
          emailValidation.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {emailValidation.isValid ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          <span>{emailValidation.message}</span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (filteredUsers.length > 0 || (inputValue.includes('@') && emailValidation?.isValid)) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Existing users */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                Existing Users
              </div>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                >
                  <User className="w-4 h-4 text-gray-400" />
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

          {/* Custom email option */}
          {inputValue.includes('@') && emailValidation?.isValid && (
            <div>
              {filteredUsers.length > 0 && (
                <div className="border-t border-gray-100"></div>
              )}
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                Add New User
              </div>
              <button
                onClick={() => handleSelectEmail(inputValue)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
              >
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{inputValue}</div>
                  <div className="text-xs text-gray-500">Add as new KPI Champion</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
