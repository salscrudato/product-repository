// src/scripts/resetCommercialPropertyTasks.js
/**
 * Script to reset tasks with commercial property insurance focus
 * 
 * This script will:
 * 1. Delete all existing tasks
 * 2. Load 10 realistic commercial property insurance tasks
 * 3. Distribute tasks across all phases (research, develop, compliance, implementation)
 * 
 * Usage:
 * - Run in browser console: copy and paste this script
 * - Or import and call from a React component
 */

import { resetWithCommercialPropertyTasks, previewCommercialPropertyTasks } from '../utils/commercialPropertyTaskSeeder.js';

/**
 * Main execution function
 */
async function runTaskReset() {
  try {
    console.log('🏢 Commercial Property Task Reset Script');
    console.log('========================================');
    
    // Show preview of what will be created
    console.log('\n📋 Preview of tasks to be created:');
    previewCommercialPropertyTasks();
    
    // Confirm before proceeding
    const confirmed = window.confirm(
      '⚠️  This will DELETE ALL existing tasks and replace them with 10 commercial property tasks.\n\n' +
      'Are you sure you want to proceed?'
    );
    
    if (!confirmed) {
      console.log('❌ Task reset cancelled by user');
      return;
    }
    
    console.log('\n🚀 Starting task reset...');
    
    // Execute the reset
    const result = await resetWithCommercialPropertyTasks();
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! Commercial property tasks have been loaded.');
      console.log('\n📊 Results:');
      console.log(`   • Deleted: ${result.deleted} old tasks`);
      console.log(`   • Added: ${result.added} new commercial property tasks`);
      console.log('\n💡 You can now view the tasks in the Tasks page.');
      
      // Show success alert
      alert(
        '✅ Success!\n\n' +
        `Deleted ${result.deleted} old tasks\n` +
        `Added ${result.added} commercial property tasks\n\n` +
        'Check the Tasks page to see your new commercial property workflow!'
      );
    } else {
      console.error('❌ Task reset failed:', result.error);
      alert('❌ Task reset failed. Check the console for details.');
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    alert('❌ Script failed to execute. Check the console for details.');
  }
}

/**
 * Browser console execution
 * Copy and paste this entire script into the browser console to run
 */
if (typeof window !== 'undefined') {
  // Add to window for easy console access
  window.resetCommercialPropertyTasks = runTaskReset;
  window.previewCommercialPropertyTasks = previewCommercialPropertyTasks;
  
  console.log('🏢 Commercial Property Task Reset Script Loaded!');
  console.log('');
  console.log('Available commands:');
  console.log('  • resetCommercialPropertyTasks() - Run the full reset');
  console.log('  • previewCommercialPropertyTasks() - Preview tasks without changing data');
  console.log('');
  console.log('⚠️  WARNING: resetCommercialPropertyTasks() will DELETE ALL existing tasks!');
}

// Export for module usage
export { runTaskReset as default, runTaskReset, previewCommercialPropertyTasks };

/**
 * React Component Integration Example
 * 
 * To use this in a React component:
 * 
 * import { runTaskReset } from '../scripts/resetCommercialPropertyTasks';
 * 
 * function AdminPanel() {
 *   const handleResetTasks = async () => {
 *     await runTaskReset();
 *   };
 * 
 *   return (
 *     <button onClick={handleResetTasks}>
 *       Reset with Commercial Property Tasks
 *     </button>
 *   );
 * }
 */

/**
 * Console Usage Instructions
 * 
 * 1. Open browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Run: resetCommercialPropertyTasks()
 * 5. Confirm when prompted
 * 6. Check Tasks page for new commercial property tasks
 */
