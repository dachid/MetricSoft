/**
 * Script to fix fiscal year status based on existing confirmations
 * Run this to update fiscal years that have confirmations but wrong status
 */

const { PrismaClient } = require('@prisma/client');

async function fixFiscalYearStatus() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking fiscal years with status/confirmation mismatches...');

    // Get all fiscal years with their confirmations
    const fiscalYears = await prisma.fiscalYear.findMany({
      include: {
        confirmations: true
      }
    });

    console.log(`📊 Found ${fiscalYears.length} fiscal years`);

    for (const fy of fiscalYears) {
      const orgConfirmed = fy.confirmations.some(c => c.confirmationType === 'org_structure');
      const perfConfirmed = fy.confirmations.some(c => c.confirmationType === 'performance_components');

      console.log(`\n🔍 Fiscal Year: ${fy.name} (${fy.id})`);
      console.log(`   Current Status: ${fy.status}`);
      console.log(`   Org Confirmed: ${orgConfirmed}`);
      console.log(`   Perf Confirmed: ${perfConfirmed}`);

      let targetStatus = fy.status;
      let needsUpdate = false;

      // Determine what the status should be
      if (orgConfirmed && perfConfirmed) {
        // Both confirmations exist - should be locked
        if (fy.status !== 'locked') {
          targetStatus = 'locked';
          needsUpdate = true;
        }
      } else if (orgConfirmed) {
        // Only org confirmation exists - should be active
        if (fy.status === 'draft') {
          targetStatus = 'active';
          needsUpdate = true;
        }
      }
      // If no confirmations, draft is correct

      if (needsUpdate) {
        console.log(`   ⚡ Updating status: ${fy.status} → ${targetStatus}`);
        
        await prisma.fiscalYear.update({
          where: { id: fy.id },
          data: { status: targetStatus }
        });

        console.log(`   ✅ Status updated successfully`);
      } else {
        console.log(`   ✅ Status is correct, no update needed`);
      }
    }

    console.log('\n🎉 Fiscal year status fix completed!');

  } catch (error) {
    console.error('💥 Error fixing fiscal year status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixFiscalYearStatus();
