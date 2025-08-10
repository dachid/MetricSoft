'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type LoginStep = 'email' | 'code'

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const { sendPasswordlessCode, verifyPasswordlessCode } = useAuth()
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    const result = await sendPasswordlessCode({ email })
    
    if (result.error) {
      setError(result.error)
    } else {
      setMessage('Login code sent to your email! Check your inbox and enter the 6-digit code below.')
      setStep('code')
    }
    setIsLoading(false)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await verifyPasswordlessCode({ email, code })
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MetricSoft
              </h1>
            </div>
            
            {step === 'email' ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back
                </h2>
                <p className="text-gray-600 mb-8">
                  Enter your email to receive a secure login code
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Enter your code
                </h2>
                <p className="text-gray-600 mb-8">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
              </>
            )}
          </div>

          <div>
            {step === 'email' ? (
              <form className="space-y-6" onSubmit={handleSendCode}>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-red-700">
                        {error}
                        {error.includes('No account found') && (
                          <div className="mt-2 p-3 bg-red-100 rounded border-l-4 border-red-400">
                            <div className="font-medium text-red-800">Account Not Found</div>
                            <div className="text-red-700 mt-1">
                              Your email address hasn't been onboarded to MetricSoft yet. 
                              Please contact your administrator to request access.
                            </div>
                            <div className="mt-2 text-xs text-red-600">
                              Only pre-authorized users can access the system for security purposes.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                      placeholder="Enter your work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition duration-150 ease-in-out hover:scale-105"
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {isLoading ? 'Sending code...' : 'Send login code'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleVerifyCode}>
                {message && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-green-700">{message}</div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-red-700">
                        {error}
                        {(error.includes('expired') || error.includes('Too many failed attempts')) && (
                          <div className="mt-2 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                            <div className="text-yellow-800 text-xs">
                              💡 Click "Use different email" below to request a new verification code.
                            </div>
                          </div>
                        )}
                        {error.includes('Invalid verification code') && (
                          <div className="mt-2 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <div className="text-blue-800 text-xs">
                              🔍 Double-check your email for the correct 6-digit code. 
                              Codes are case-sensitive and contain only numbers.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    6-digit code
                  </label>
                  <div className="relative">
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out text-center text-xl font-mono tracking-widest"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition duration-150 ease-in-out hover:scale-105"
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                    {isLoading ? 'Verifying...' : 'Access Dashboard'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="w-full text-sm text-blue-600 hover:text-blue-500 transition duration-150 ease-in-out"
                  >
                    ← Use different email
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Secure passwordless login</span>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Don't have an account? Contact your administrator to get onboarded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Performance Management Infographics */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center h-full px-12 text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              The Pioneer Flexible KPI Framework
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              MetricSoft adapts to any organization style - from startups to enterprises. Build your performance management system your way.
            </p>
            
            {/* Performance Management Benefits */}
            <div className="space-y-4">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 transform hover:scale-105 transition duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Flexible KPIs</div>
                    <div className="text-sm text-blue-100">Custom metrics for any business</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 transform hover:scale-105 transition duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Multi-Perspective</div>
                    <div className="text-sm text-blue-100">Financial, Customer, Learning & Growth</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 transform hover:scale-105 transition duration-300">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Multi-Tenant</div>
                    <div className="text-sm text-blue-100">Perfect for any organization size</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Elements - KPI themed */}
        <div className="absolute top-20 right-20 w-20 h-20 bg-white bg-opacity-10 rounded-full flex items-center justify-center animate-pulse">
          <div className="text-white font-bold">KPI</div>
        </div>
        <div className="absolute bottom-20 right-32 w-16 h-16 bg-green-400 bg-opacity-20 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '1s'}}>
          <div className="text-white text-xs">📊</div>
        </div>
        <div className="absolute top-1/3 right-12 w-12 h-12 bg-purple-400 bg-opacity-20 rounded-full flex items-center justify-center animate-ping" style={{animationDelay: '2s'}}>
          <div className="text-white text-xs">📈</div>
        </div>
      </div>
    </div>
  )
}
