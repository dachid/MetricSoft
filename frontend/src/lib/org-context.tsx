'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Organization {
  id: string
  name: string
  tenantId: string
}

interface OrganizationalContextType {
  currentOrg: Organization | null
  setCurrentOrg: (org: Organization | null) => void
  organizations: Organization[]
  setOrganizations: (orgs: Organization[]) => void
}

const OrganizationalContext = createContext<OrganizationalContextType | undefined>(undefined)

export function OrganizationalProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  return (
    <OrganizationalContext.Provider
      value={{
        currentOrg,
        setCurrentOrg,
        organizations,
        setOrganizations
      }}
    >
      {children}
    </OrganizationalContext.Provider>
  )
}

export function useOrganizational() {
  const context = useContext(OrganizationalContext)
  if (context === undefined) {
    throw new Error('useOrganizational must be used within an OrganizationalProvider')
  }
  return context
}