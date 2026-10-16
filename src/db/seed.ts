import { NoticeStore } from './store';

async function seed() {
  console.log('🌱 Seeding Notice Decoder sample demonstration dataset...');
  try {
    await NoticeStore.seedDemoData();
    console.log('✅ Successfully seeded sample dataset.');
    console.log('   - Notice: [Sample] Academic Schedule & Lab Circular (November 2026)');
    console.log('   - Event 1: Internal Test 2 (10:00–11:30 AM, Room 204)');
    console.log('   - Event 2: Lab Record Submission Deadline (12:00 noon, Department Office)');
    console.log('   - Event 3: Guest Lecture: AI in Healthcare (11:00 AM–12:30 PM, Seminar Hall)');
    console.log('   - Conflict Check: 1 Overlap (30m) + 1 Deadline Alert');
  } catch (err: any) {
    console.error('❌ Seeding failed:', err.message);
  }
}

seed();
