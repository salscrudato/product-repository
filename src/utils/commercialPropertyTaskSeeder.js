// src/utils/commercialPropertyTaskSeeder.js
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Realistic commercial property insurance tasks across various stages
 */
const commercialPropertyTasks = [
  // Research & Ideation Phase
  {
    title: 'Market Analysis - Commercial Property CAT Exposure',
    description: 'Analyze catastrophe exposure trends in commercial property markets, focusing on wildfire and flood risks in high-value commercial districts. Research competitor pricing strategies for CAT-exposed properties.',
    phase: 'research',
    priority: 'high',
    assignee: 'Sal Scrudato',
    dueDate: '2024-05-16'
  },
  {
    title: 'Competitive Intelligence - Warehouse Coverage',
    description: 'Research competitor offerings for warehouse and distribution center coverage, including business interruption limits, equipment breakdown coverage, and supply chain disruption endorsements.',
    phase: 'research',
    priority: 'medium',
    assignee: 'Mike Rodriguez',
    dueDate: '2024-01-25'
  },

  // Product Development Phase
  {
    title: 'Design Enhanced Equipment Breakdown Coverage',
    description: 'Develop comprehensive equipment breakdown coverage for commercial properties including HVAC systems, elevators, boilers, and manufacturing equipment. Include cyber-physical system coverage.',
    phase: 'develop',
    priority: 'high',
    assignee: 'David Kim',
    dueDate: '2024-02-15'
  },
  {
    title: 'Create Green Building Endorsement',
    description: 'Design endorsement for LEED-certified and green commercial buildings, including coverage for sustainable materials, energy-efficient systems, and green certification replacement costs.',
    phase: 'develop',
    priority: 'medium',
    assignee: 'Rebecca',
    dueDate: '2024-02-28'
  },
  {
    title: 'Develop Business Income Calculator',
    description: 'Build actuarial model for business income coverage calculations based on property type, seasonal variations, and industry-specific loss patterns for commercial properties.',
    phase: 'develop',
    priority: 'high',
    assignee: 'Peter',
    dueDate: '2024-03-10'
  },

  // Compliance & Filings Phase
  {
    title: 'State Filing - Texas Commercial Property Forms',
    description: 'Submit regulatory filing for new commercial property forms in Texas, including windstorm coverage modifications and updated replacement cost provisions.',
    phase: 'compliance',
    priority: 'high',
    assignee: 'Dan',
    dueDate: '2024-02-05'
  },
  {
    title: 'NAIC Compliance Review - Ordinance Coverage',
    description: 'Ensure ordinance and law coverage provisions comply with NAIC guidelines and state-specific building code requirements for commercial properties.',
    phase: 'compliance',
    priority: 'medium',
    assignee: 'Tony',
    dueDate: '2024-02-20'
  },
  {
    title: 'Multi-State Filing - Equipment Breakdown',
    description: 'Coordinate regulatory filings for equipment breakdown coverage across 15 states, including rate schedules and coverage form approvals.',
    phase: 'compliance',
    priority: 'high',
    assignee: 'Cristy',
    dueDate: '2024-03-01'
  },

  // Implementation & Launch Phase
  {
    title: 'Launch Commercial Property Plus Product',
    description: 'Execute go-to-market strategy for enhanced commercial property product including agent training, marketing materials, and underwriting guidelines rollout.',
    phase: 'implementation',
    priority: 'high',
    assignee: 'Sal',
    dueDate: '2024-03-15'
  },
  {
    title: 'System Integration - Property Valuation API',
    description: 'Integrate third-party property valuation API into underwriting system for real-time commercial property valuations and replacement cost estimates.',
    phase: 'implementation',
    priority: 'medium',
    assignee: 'Jane',
    dueDate: '2024-04-01'
  }
];

/**
 * Delete all existing tasks from the tasks collection
 */
async function deleteAllTasks() {
  try {
    console.log('🗑️  Deleting all existing tasks...');
    
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const deletePromises = tasksSnapshot.docs.map(taskDoc => 
      deleteDoc(doc(db, 'tasks', taskDoc.id))
    );
    
    await Promise.all(deletePromises);
    console.log(`✅ Successfully deleted ${tasksSnapshot.docs.length} existing tasks`);
    
    return tasksSnapshot.docs.length;
  } catch (error) {
    console.error('❌ Error deleting tasks:', error);
    throw error;
  }
}

/**
 * Add commercial property tasks to the tasks collection
 */
async function addCommercialPropertyTasks() {
  try {
    console.log('📝 Adding commercial property tasks...');
    
    const addPromises = commercialPropertyTasks.map(task => 
      addDoc(collection(db, 'tasks'), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    
    await Promise.all(addPromises);
    console.log(`✅ Successfully added ${commercialPropertyTasks.length} commercial property tasks`);
    
    return commercialPropertyTasks.length;
  } catch (error) {
    console.error('❌ Error adding commercial property tasks:', error);
    throw error;
  }
}

/**
 * Main function to reset tasks with commercial property focus
 * Deletes all existing tasks and loads 10 realistic commercial property tasks
 */
export async function resetWithCommercialPropertyTasks() {
  try {
    console.log('🚀 Starting commercial property task reset...');
    
    // Step 1: Delete all existing tasks
    const deletedCount = await deleteAllTasks();
    
    // Step 2: Add commercial property tasks
    const addedCount = await addCommercialPropertyTasks();
    
    console.log('📊 Task Reset Summary:');
    console.log(`   • Deleted: ${deletedCount} existing tasks`);
    console.log(`   • Added: ${addedCount} commercial property tasks`);
    console.log('✅ Commercial property task reset completed successfully!');
    
    return {
      deleted: deletedCount,
      added: addedCount,
      success: true
    };
  } catch (error) {
    console.error('❌ Commercial property task reset failed:', error);
    return {
      deleted: 0,
      added: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Get summary of commercial property tasks by phase
 */
export function getCommercialPropertyTaskSummary() {
  const summary = {
    research: [],
    develop: [],
    compliance: [],
    implementation: []
  };
  
  commercialPropertyTasks.forEach(task => {
    summary[task.phase].push({
      title: task.title,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate
    });
  });
  
  return summary;
}

/**
 * Preview function to show what tasks will be created
 */
export function previewCommercialPropertyTasks() {
  console.log('📋 Commercial Property Tasks Preview:');
  console.log('=====================================');
  
  const phases = ['research', 'develop', 'compliance', 'implementation'];
  
  phases.forEach(phase => {
    const phaseTasks = commercialPropertyTasks.filter(task => task.phase === phase);
    console.log(`\n${phase.toUpperCase()} (${phaseTasks.length} tasks):`);
    
    phaseTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title}`);
      console.log(`     Priority: ${task.priority} | Assignee: ${task.assignee} | Due: ${task.dueDate}`);
    });
  });
  
  console.log('\n📊 Summary:');
  console.log(`   • Total Tasks: ${commercialPropertyTasks.length}`);
  console.log(`   • Research: ${commercialPropertyTasks.filter(t => t.phase === 'research').length}`);
  console.log(`   • Development: ${commercialPropertyTasks.filter(t => t.phase === 'develop').length}`);
  console.log(`   • Compliance: ${commercialPropertyTasks.filter(t => t.phase === 'compliance').length}`);
  console.log(`   • Implementation: ${commercialPropertyTasks.filter(t => t.phase === 'implementation').length}`);
}

export default {
  resetWithCommercialPropertyTasks,
  getCommercialPropertyTaskSummary,
  previewCommercialPropertyTasks,
  deleteAllTasks,
  addCommercialPropertyTasks
};
