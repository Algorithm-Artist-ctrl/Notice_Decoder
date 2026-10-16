import { NoticeStore } from './store';

async function seed() {
  console.log('🌱 Seeding Notice Decoder demonstration dataset (PS-02 Ground Truth)...');
  try {
    await NoticeStore.seedDemoData();
    console.log('✅ Successfully seeded demonstration dataset.');
    console.log('   - Notice: [DEMO] III-Year CSE Schedule & Lab Circular (13 Nov 2026)');
    console.log('   - Event 1: Internal Test 2 (10:00–11:30 AM, Room 204)');
    console.log('   - Event 2: Lab Record Submission Deadline (12:00 noon, Department Office)');
    console.log('   - Event 3: Guest Lecture: AI in Healthcare (11:00 AM–12:30 PM, Seminar Hall)');
    console.log('   - Verified Conflicts: 1 Hard Overlap (30m) + 1 Deadline Warning');
  } catch (err: any) {
    console.error('❌ Seeding failed:', err.message);
  }
}

seed();
