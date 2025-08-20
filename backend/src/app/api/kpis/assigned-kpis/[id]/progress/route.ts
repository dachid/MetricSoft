import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'

// GET /api/kpis/assigned-kpis/[id]/progress - Get progress history for an assigned KPI
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const kpiId = params.id

    // Try to find the KPI in IndividualKPI first, then OrganizationalKPI
    let individualKpi = await prisma.individualKPI.findUnique({
      where: { id: kpiId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        component: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    })

    let orgKpi
    if (!individualKpi) {
      // Try organizational KPIs
      orgKpi = await prisma.organizationalKPI.findUnique({
        where: { id: kpiId },
        include: {
          organizationalUnit: {
            select: {
              name: true,
              code: true,
            },
          },
          component: {
            select: {
              name: true,
              description: true,
            },
          },
          assignedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    }

    if (!individualKpi && !orgKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    const kpiData = individualKpi || orgKpi
    const isIndividualKpi = !!individualKpi

    // Check if user has access to this KPI
    const user = authResult.user
    const isSuperAdmin = user?.roles?.some((role: any) => role.code === 'SUPER_ADMIN')
    const isOrgAdmin = user?.roles?.some((role: any) => role.code === 'ORGANIZATION_ADMIN')
    
    if (!isSuperAdmin && !isOrgAdmin) {
      // For individual KPIs, user must be the owner
      if (isIndividualKpi && individualKpi?.userId !== user?.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      
      // For organizational KPIs, check if user is a KPI champion for this org unit
      if (!isIndividualKpi && orgKpi?.organizationalUnitId) {
        const isKpiChampion = await prisma.orgUnitKpiChampion.findFirst({
          where: {
            orgUnitId: orgKpi.organizationalUnitId,
            userId: user?.id
          }
        })

        if (!isKpiChampion) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // For now, return the KPI data (progress tracking will be implemented when the schema is updated)
    return NextResponse.json({
      success: true,
      data: {
        kpi: kpiData,
        progressEntries: [] // Will be implemented when progress table is added
      }
    })

  } catch (error) {
    console.error('Error fetching KPI progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/kpis/assigned-kpis/[id]/progress - Add new progress entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const kpiId = params.id
    const body = await request.json()
    const { 
      actualValue, 
      progressDate, 
      comments, 
      status
    } = body

    // Validate required fields
    if (actualValue === undefined || actualValue === null) {
      return NextResponse.json({ error: 'Actual value is required' }, { status: 400 })
    }

    if (!progressDate) {
      return NextResponse.json({ error: 'Progress date is required' }, { status: 400 })
    }

    // Verify the KPI exists and get its details
    let individualKpi = await prisma.individualKPI.findUnique({
      where: { id: kpiId },
      select: {
        id: true,
        userId: true,
        targetValue: true,
        currentValue: true,
        status: true,
        unit: true,
      },
    })

    let orgKpi
    let isIndividualKpi = true
    if (!individualKpi) {
      orgKpi = await prisma.organizationalKPI.findUnique({
        where: { id: kpiId },
        select: {
          id: true,
          organizationalUnitId: true,
          targetValue: true,
          currentValue: true,
          status: true,
          unit: true,
        },
      })
      isIndividualKpi = false
    }

    if (!individualKpi && !orgKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    const kpiData = individualKpi || orgKpi

    // Check permissions
    const user = authResult.user
    const isSuperAdmin = user?.roles?.some((role: any) => role.code === 'SUPER_ADMIN')
    const isOrgAdmin = user?.roles?.some((role: any) => role.code === 'ORGANIZATION_ADMIN')
    
    if (!isSuperAdmin && !isOrgAdmin) {
      if (isIndividualKpi && individualKpi?.userId !== user?.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      
      if (!isIndividualKpi && orgKpi?.organizationalUnitId) {
        const isKpiChampion = await prisma.orgUnitKpiChampion.findFirst({
          where: {
            orgUnitId: orgKpi.organizationalUnitId,
            userId: user?.id
          }
        })

        if (!isKpiChampion) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // Validate progress date
    const progressDateObj = new Date(progressDate)
    if (isNaN(progressDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid progress date' }, { status: 400 })
    }

    // Validate actual value
    if (isNaN(Number(actualValue))) {
      return NextResponse.json({ error: 'Actual value must be a number' }, { status: 400 })
    }

    // Calculate progress percentage
    const target = Number(kpiData!.targetValue)
    const actual = Number(actualValue)
    let progressPercentage = 0
    
    if (target !== 0) {
      progressPercentage = (actual / target) * 100
    }

    // Update the KPI with new progress
    if (isIndividualKpi) {
      await prisma.individualKPI.update({
        where: { id: kpiId },
        data: {
          currentValue: actual,
          status: status || 'IN_PROGRESS',
        }
      })
    } else {
      await prisma.organizationalKPI.update({
        where: { id: kpiId },
        data: {
          currentValue: actual,
          status: status || 'IN_PROGRESS',
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        kpiId,
        actualValue: actual,
        targetValue: target,
        progressPercentage,
        status: status || 'IN_PROGRESS',
        progressDate: progressDateObj,
        comments
      }
    })

  } catch (error) {
    console.error('Error updating KPI progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/kpis/assigned-kpis/[id]/progress - Update KPI status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const kpiId = params.id
    const body = await request.json()
    const { status, targetValue, currentValue } = body

    // Verify the KPI exists
    let individualKpi = await prisma.individualKPI.findUnique({
      where: { id: kpiId },
      select: {
        id: true,
        userId: true,
        targetValue: true,
        currentValue: true,
        status: true,
      },
    })

    let orgKpi
    let isIndividualKpi = true
    if (!individualKpi) {
      orgKpi = await prisma.organizationalKPI.findUnique({
        where: { id: kpiId },
        select: {
          id: true,
          organizationalUnitId: true,
          targetValue: true,
          currentValue: true,
          status: true,
        },
      })
      isIndividualKpi = false
    }

    if (!individualKpi && !orgKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Check permissions
    const user = authResult.user
    const isSuperAdmin = user?.roles?.some((role: any) => role.code === 'SUPER_ADMIN')
    const isOrgAdmin = user?.roles?.some((role: any) => role.code === 'ORGANIZATION_ADMIN')
    
    if (!isSuperAdmin && !isOrgAdmin) {
      if (isIndividualKpi && individualKpi?.userId !== user?.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      
      if (!isIndividualKpi && orgKpi?.organizationalUnitId) {
        const isKpiChampion = await prisma.orgUnitKpiChampion.findFirst({
          where: {
            orgUnitId: orgKpi.organizationalUnitId,
            userId: user?.id
          }
        })

        if (!isKpiChampion) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // Update the KPI
    const updateData: any = {}
    if (status) updateData.status = status
    if (targetValue !== undefined) updateData.targetValue = Number(targetValue)
    if (currentValue !== undefined) updateData.currentValue = Number(currentValue)

    if (isIndividualKpi) {
      await prisma.individualKPI.update({
        where: { id: kpiId },
        data: updateData
      })
    } else {
      await prisma.organizationalKPI.update({
        where: { id: kpiId },
        data: updateData
      })
    }

    return NextResponse.json({
      success: true,
      message: 'KPI updated successfully'
    })

  } catch (error) {
    console.error('Error updating KPI:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
