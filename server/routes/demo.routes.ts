import { Hono } from 'hono';
import { NoticeStore } from '../../src/db/store';

const router = new Hono();

/**
 * Get isolated sandbox demo dataset (for evaluation/presentation without DB pollution)
 */
router.get('/data', async (c) => {
  try {
    const demoNoticeId = 'demo-notice-ps02';
    let notice = await NoticeStore.getNoticeById(demoNoticeId);
    let events = await NoticeStore.getEventsByNoticeId(demoNoticeId);

    if (!notice || events.length === 0) {
      await NoticeStore.seedDemoData();
      notice = await NoticeStore.getNoticeById(demoNoticeId);
      events = await NoticeStore.getEventsByNoticeId(demoNoticeId);
    }

    return c.json({
      success: true,
      data: { notice, events },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get 4 isolated interactive demonstration scenarios
 */
router.get('/scenarios', async (c) => {
  return c.json({
    success: true,
    data: [
      {
        id: 'scenario-academic-conflict',
        title: 'Academic Schedule: Mid-Term Exam & AI Lecture Overlap',
        category: 'academic',
        domain: 'academic',
        analysisCase: 'A',
        description: 'Demonstrates automatic detection of a 30-minute hard overlap between an examination and a guest lecture, along with a deadline warning.',
        badge: 'Interval Conflict (30m Overlap)',
        text: `DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
ACADEMIC NOTICE: MID-SEMESTER EXAMINATIONS & SPECIAL LECTURES

1. Course: CS401 Advanced Database Systems Mid-Term Examination
   Date: 25 November 2026
   Time: 10:00 to 11:30
   Venue: Main Examination Hall A

2. Special Guest Lecture: Modern AI Agents in Production by Dr. Robert Vance
   Date: 25 November 2026
   Time: 11:00 to 12:30
   Venue: University Auditorium B
   Audience: All Computer Science students

3. Lab Record Submission Deadline
   Date: 25 November 2026
   Deadline: 12:00
   Venue: Software Lab 2`,
      },
      {
        id: 'scenario-point-deadline',
        title: 'National Research Grant Application & Proposal Submission',
        category: 'government',
        domain: 'government',
        analysisCase: 'B',
        description: 'Demonstrates distinct point deadline extraction with strict cut-off time, countdown tracking, and zero timed conflict errors.',
        badge: 'Strict Point Deadline (Zero Conflicts)',
        text: `MINISTRY OF SCIENCE AND TECHNOLOGY
CALL FOR NATIONAL RESEARCH GRANT PROPOSALS — FISCAL CYCLE 2026-27

Notice Ref: MST/RND/2026/8492
Subject: Submission of advanced computing and climate technology research proposals.

ELIGIBILITY AND SUBMISSION GUIDELINES:
- Proposals are invited from accredited universities, research institutions, and technology incubators.
- All complete project proposals, budget justification sheets, and institutional endorsement letters must be uploaded via the national portal.

CRITICAL CUT-OFF DEADLINE:
- Date: 15 December 2026
- Time: 23:59 IST (Hard Deadline — Portal closes automatically)
- Late or incomplete submissions will not be admitted for technical committee review.`,
      },
      {
        id: 'scenario-zero-date-policy',
        title: 'Campus Central Library Modernization & Quiet Study Zone Directives',
        category: 'institutional',
        domain: 'institutional',
        analysisCase: 'D',
        description: 'Demonstrates zero-date reference and policy processing: extracts directives, compliance rules, and contacts without hallucinating events.',
        badge: 'Informational Policy (0 Events)',
        text: `OFFICE OF THE UNIVERSITY LIBRARIAN
CAMPUS DIRECTIVE: LIBRARY RENOVATION & STUDY ZONE REGULATIONS

Directive No: LIB-DIR-2026/09

GENERAL RULES & DIRECTIVES:
1. Third Floor Quiet Zone: The entire third floor is designated as a 24/7 Silent Study Zone. Mobile phone calls, audio playback without headphones, and group discussions are strictly prohibited.
2. Automated RFID Checkout: All books and journals must be scanned at self-checkout kiosks prior to exiting the facility.
3. Overnight Reserve Collection: Overnight loans are available for reference textbooks starting at 20:00 and must be returned the next morning by 09:00.
4. Compliance: Violators will receive an initial written reprimand followed by a 14-day library privilege suspension.

Direct queries to: library-services@university.edu | Phone: +91 11 2659 7000`,
      },
      {
        id: 'scenario-corporate-interview',
        title: 'Executive Search: Senior Technical Architect Interview Rounds',
        category: 'corporate',
        domain: 'corporate',
        analysisCase: 'C',
        description: 'Demonstrates professional corporate document processing: interview rounds, technical whiteboard evaluation, and preparation deadlines.',
        badge: 'Multi-Stage Schedule (Corporate)',
        text: `ACME TECHNOLOGIES CORP — TALENT ACQUISITION
CANDIDATE INTERVIEW SCHEDULE & BRIEFING MEMORANDUM

Candidate: Alex Mercer
Position: Senior Technical Architect (Distributed Systems)
Interview Date: 04 December 2026

SCHEDULE OF EVALUATION SESSIONS:
1. System Architecture & High-Scale Design Round
   Date: 04 December 2026
   Time: 09:30 to 11:00
   Format: Whiteboard / Virtual Architecture Studio
   Interviewers: VP of Engineering & Principal Architect

2. Engineering Leadership & Culture Alignment
   Date: 04 December 2026
   Time: 11:30 to 12:30
   Format: Interactive Discussion
   Interviewer: Head of People & CTO

3. Portfolio & Reference Architecture Submission
   Date: 04 December 2026
   Deadline: 17:00
   Note: Submit architecture diagrams and GitHub repository link via portal.`,
      },
    ],
  });
});

/**
 * Re-seed demo dataset
 */
router.post('/seed', async (c) => {
  try {
    await NoticeStore.seedDemoData();
    const notice = await NoticeStore.getNoticeById('demo-notice-ps02');
    const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
    return c.json({
      success: true,
      message: 'Demonstration dataset reloaded successfully',
      data: { notice, events },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export { router as demoRoutes };
