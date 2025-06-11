// src/utils/taskSeeder.js
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const sampleTasks = [
  {
    title: 'Market Analysis for Cyber Insurance',
    description: 'Research current cyber insurance market trends, competitor analysis, and identify market gaps for small business segment.',
    phase: 'research',
    priority: 'high',
    assignee: 'Sarah Chen',
    dueDate: '2024-02-15'
  },
  {
    title: 'Customer Survey - Auto Insurance Preferences',
    description: 'Conduct survey to understand customer preferences for auto insurance features and pricing models.',
    phase: 'research',
    priority: 'medium',
    assignee: 'Mike Rodriguez',
    dueDate: '2024-02-20'
  },
  {
    title: 'Competitive Analysis - Home Insurance',
    description: 'Analyze top 5 competitors in home insurance market, pricing strategies, and coverage options.',
    phase: 'research',
    priority: 'medium',
    assignee: 'Sarah Chen',
    dueDate: '2024-02-10'
  },
  {
    title: 'Design Umbrella Insurance Product',
    description: 'Create comprehensive umbrella insurance product with multiple coverage tiers and pricing structure.',
    phase: 'develop',
    priority: 'high',
    assignee: 'David Kim',
    dueDate: '2024-03-01'
  },
  {
    title: 'Develop Cyber Liability Coverage Forms',
    description: 'Create standardized forms for cyber liability coverage including data breach and business interruption.',
    phase: 'develop',
    priority: 'high',
    assignee: 'Lisa Wang',
    dueDate: '2024-02-28'
  },
  {
    title: 'Build Pricing Model for Small Business',
    description: 'Develop actuarial pricing model for small business insurance products with risk assessment factors.',
    phase: 'develop',
    priority: 'medium',
    assignee: 'David Kim',
    dueDate: '2024-03-15'
  },
  {
    title: 'State Filing - California Auto Insurance',
    description: 'Submit regulatory filing for new auto insurance product in California, including rate schedules.',
    phase: 'compliance',
    priority: 'high',
    assignee: 'Jennifer Adams',
    dueDate: '2024-02-25'
  },
  {
    title: 'Compliance Review - Cyber Insurance Forms',
    description: 'Legal and compliance review of cyber insurance forms for multi-state approval.',
    phase: 'compliance',
    priority: 'medium',
    assignee: 'Jennifer Adams',
    dueDate: '2024-03-10'
  },
  {
    title: 'NAIC Model Law Compliance Check',
    description: 'Ensure all new products comply with NAIC model laws and regulations.',
    phase: 'compliance',
    priority: 'medium',
    assignee: 'Robert Johnson',
    dueDate: '2024-03-05'
  },
  {
    title: 'Launch Auto Insurance Plus Product',
    description: 'Go-to-market execution for new auto insurance product including agent training and marketing materials.',
    phase: 'implementation',
    priority: 'high',
    assignee: 'Mike Rodriguez',
    dueDate: '2024-03-20'
  },
  {
    title: 'System Integration - Cyber Insurance',
    description: 'Integrate cyber insurance product into core systems including policy administration and claims.',
    phase: 'implementation',
    priority: 'medium',
    assignee: 'David Kim',
    dueDate: '2024-04-01'
  },
  {
    title: 'Agent Training Program - Umbrella Insurance',
    description: 'Develop and deliver comprehensive training program for agents on new umbrella insurance product.',
    phase: 'implementation',
    priority: 'medium',
    assignee: 'Lisa Wang',
    dueDate: '2024-04-15'
  }
];

/**
 * Seed the tasks collection with sample data
 * Only adds tasks if the collection is empty
 */
export async function seedTasks() {
  try {
    // Check if tasks already exist
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    
    if (tasksSnapshot.empty) {
      console.log('Seeding tasks collection with sample data...');
      
      const promises = sampleTasks.map(task => 
        addDoc(collection(db, 'tasks'), {
          ...task,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(promises);
      console.log(`✅ Successfully seeded ${sampleTasks.length} sample tasks`);
      return true;
    } else {
      console.log('Tasks collection already contains data, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
    throw error;
  }
}

/**
 * Clear all tasks from the collection
 * Use with caution - this will delete all existing tasks
 */
export async function clearTasks() {
  try {
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const deletePromises = tasksSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log('✅ All tasks cleared');
  } catch (error) {
    console.error('Error clearing tasks:', error);
    throw error;
  }
}

const taskSeederExports = { seedTasks, clearTasks };
export default taskSeederExports;
