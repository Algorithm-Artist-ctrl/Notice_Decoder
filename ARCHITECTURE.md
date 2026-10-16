# System Architecture & Technical Specifications

**Notice Decoder** — Academic Timetable & Circular Parser Engine  
*Architectural specifications and formal conflict arithmetic proofs.*

---

## 1. High-Level System Architecture

Notice Decoder is structured around a **Human-in-the-Loop Review Gate**, ensuring that no unverified or hallucinated event ever enters a student's personal calendar.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          STAGE 1: DOCUMENT INTAKE                      │
│   • 10 MB limit strictly enforced on both Client and Server            │
│   • Multi-format ingestion: Text-based PDF, PNG, JPG, or Raw Text      │
│   • PDF text layer extraction (pdf-parse) with OCR fallback            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STAGE 2: ENTITY EXTRACTION                      │
│   • Prompt-grounded Gemini 2.5 Flash / Heuristic NLP Parser            │
│   • Extracts: Title, Category, Date, Start, End, Venue, Audience       │
│   • Untrusted Input Isolation: Defense against prompt injection        │
│   • Strict Zod Schema Validation at the boundary                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STAGE 3: NORMALIZATION & EVIDENCE LINK               │
│   • Standardizes 12h/24h and natural times ("noon", "10:00 AM")        │
│   • Resolves dates to ISO 8601 (YYYY-MM-DD)                            │
│   • Exact substring quote preserved for source provenance              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STAGE 4: HUMAN-IN-THE-LOOP REVIEW GATE               │
│   • Split-Screen UI: Original Circular Prose ↔ Editable Event Cards   │
│   • Highlights ambiguous dates or missing durations for student review │
│   • Real-time deterministic conflict recalculation on every edit       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Confirmed by Student)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 STAGE 5: CONFLICT ENGINE & RFC 5545 EXPORT             │
│   • Deterministic Half-Open Interval Math [start, end)                 │
│   • Point-in-time deadline warning detection                           │
│   • Neon Serverless PostgreSQL persistence                             │
│   • RFC 5545 compliant .ics calendar generation                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Deterministic Conflict Engine Mathematics

Unlike non-deterministic LLM approaches, Notice Decoder executes schedule clash detection in pure application code using formal interval arithmetic.

### 2.1 Half-Open Intervals
Every timed event $A$ is modeled as a half-open interval:
$$I_A = [A_{\text{start}}, A_{\text{end}})$$

Where $A_{\text{start}} < A_{\text{end}}$.

### 2.2 Interval Overlap Theorem
Two timed events $A$ and $B$ on the same date overlap if and only if:
$$A_{\text{start}} < B_{\text{end}} \quad \land \quad B_{\text{start}} < A_{\text{end}}$$

The overlap interval $O$ is defined as:
$$O = [\max(A_{\text{start}}, B_{\text{start}}), \min(A_{\text{end}}, B_{\text{end}}))$$

An overlap exists if and only if:
$$\max(A_{\text{start}}, B_{\text{start}}) < \min(A_{\text{end}}, B_{\text{end}})$$

The exact clash duration is:
$$\Delta t = \min(A_{\text{end}}, B_{\text{end}}) - \max(A_{\text{start}}, B_{\text{start}})$$

### 2.3 Proof of Adjacent Boundary Safety
Consider two contiguous events:
- Event A: 10:00 AM to 11:30 AM $\implies [10:00, 11:30)$
- Event B: 11:30 AM to 1:00 PM $\implies [11:30, 13:00)$

Evaluating the overlap window:
$$\text{overlapStart} = \max(10:00, 11:30) = 11:30$$
$$\text{overlapEnd} = \min(11:30, 13:00) = 11:30$$

Since $\text{overlapStart} \not< \text{overlapEnd}$ (they are equal), the condition fails.  
**Result:** Exactly **zero overlap**. Students are not falsely alerted for back-to-back classes.

### 2.4 Discrete Point-in-Time Deadlines
A submission deadline $D$ is modeled as a discrete point in time rather than an all-day block.
A deadline warning is triggered if and only if:
$$E_{\text{start}} \le D < E_{\text{end}}$$

This is classified as a `DEADLINE_DURING_EVENT` warning, alerting the student to complete submission prior to entering the conflicting event.

---

## 3. Database Layer Architecture

Notice Decoder uses a dual-mode persistent repository pattern:

1. **Remote Cloud Layer**: **Neon Serverless PostgreSQL**
   - Connects over `@neondatabase/serverless` using secure WebSockets / HTTP pooler.
   - Fully parameterized queries preventing SQL injection.
   - Version-controlled SQL migration scripts (`src/db/schema.sql`).
2. **Local Fallback Layer**: Built-in JSON/File persistent store
   - Automatically activates when `DATABASE_URL` is omitted.
   - Identical data contracts and methods ensuring zero downtime during local development or offline campus network conditions.
   - Guarantees records persist across browser refreshes and server reboots.

---

## 4. Security & Untrusted Input Isolation

College circulars are treated strictly as **untrusted data**:
- **Prompt Injection Defense**: Extraction prompts enforce strict output schema constraints and explicitly instruct the model to ignore any embedded directives.
- **Resource Protection**: 10 MB maximum file size limit enforced prior to buffering or processing.
- **Credential Hygiene**: Zero credentials or private connection strings bundled into frontend code.
