# Notice Decoder — Business Case & Monetization Strategy

**Team:** Byte_Brains · **Problem Statement:** PS-02

> **Important Disclosure**: The monetization models, tier structures, and pricing figures outlined below represent proposed business hypotheses designed for validation. They are not active commercial billing mechanisms or verified market commitments.

---

## 1. Target Audience & Buyer Persona

| Role | Persona | Core Pain Point | Value Proposition |
| :--- | :--- | :--- | :--- |
| **Primary User** | College Student / Class Representative (CR) | Misreads continuous circular prose; misses assignment deadlines; conflicts exams with lab vivas. | 1-click circular decoding, 30-second conflict checking, instant `.ics` export to phone. |
| **Target Buyer (B2C)** | Active Engineering / Medical / Law Student | Heavy academic schedules; juggling internships, lab records, and exams. | Low-cost semester pass (₹99/sem) for unlimited OCR and multi-circular merging. |
| **Target Buyer (B2B)** | Academic Department Head / University Registrar | Accidental timetable collisions cause student protests, re-examinations, and rescheduling chaos. | Pre-release circular conflict audit before circulars are sent out to thousands of students. |

---

## 2. Proposed Pricing Model & Tier Structure

### Tier 1: Free Student (Freemium Acquisition)
* **Price**: ₹0 (Forever)
* **Limits**: 15 notices / month; standard text PDF parsing; deterministic conflict engine; single-event `.ics` export.
* **Goal**: Organic word-of-mouth adoption across university WhatsApp & Telegram batch groups.

### Tier 2: Student Pro (Power Users & Class Representatives)
* **Proposed Price**: ₹99 / semester (~$1.20 USD)
* **Included Limits**: Unlimited notices; full OCR on phone camera photos of bulletin boards; multi-notice batch processing; priority queue.
* **Willingness to Pay Driver**: CRs are responsible for circulating timetables to 60+ classmates and cannot afford mistakes.

### Tier 3: Department Pilot (B2B Academic Departments)
* **Proposed Price**: ₹4,999 / semester
* **Features**: Timetable pre-validation; multi-batch overlap auditor (e.g. verifies CSE Dept circular does not clash with Common Science Exam slots); department-branded calendar feeds.

### Tier 4: Enterprise Campus License
* **Proposed Price**: Custom annual license (₹1.5L – ₹3L / annum depending on student body)
* **Features**: Campus ERP / SIS integration; single sign-on (SSO); dedicated Neon PostgreSQL database instance; student broadcast alerts.

---

## 3. Infrastructure & Document-Processing Cost Drivers

To ensure unit economics remain strongly profitable, Notice Decoder optimizes cost at every layer:

1. **AI Extraction (Google Gemini 2.5 Flash)**:
   * Input: ~500 tokens per circular ($0.075 per 1M input tokens = **~$0.000037 per notice**).
   * Output: ~200 tokens JSON schema ($0.30 per 1M output tokens = **~$0.000060 per notice**).
   * Total model cost per notice: **< ₹0.01 ($0.0001)**.
2. **OCR Computation**:
   * Uses client-side / lightweight worker Tesseract.js for scanned images, offloading heavy compute costs from the server.
3. **Database (Neon Serverless PostgreSQL)**:
   * Scales to zero when idle; free tier covers up to 0.5 GiB storage and 100 CU-hours, sufficient for tens of thousands of student records.
4. **Hosting (Cloudflare Workers / Pages)**:
   * Edge execution with high free tier limits (100k requests/day free).

**Unit Margin Estimate**: Gross margins exceed **95%** on the Student Pro tier at ₹99/semester.

---

## 4. Validation Roadmap for Willingness to Pay

1. **Phase 1: Class Representative Beta (Weeks 1–4)**
   * Deploy to 5 engineering class representatives across 3 colleges.
   * Measure extraction accuracy on real circulars and track frequency of detected conflicts.
2. **Phase 2: Free-to-Paid Conversion Test (Weeks 5–8)**
   * Introduce the ₹99 semester pass when users exceed 15 notices/month or request bulk image OCR.
   * Measure opt-in interest via waitlist / pre-order intent buttons without taking unauthorized payments.
3. **Phase 3: Academic Coordinator Interviews (Weeks 9–12)**
   * Demonstrate the department pre-release audit tool to 3 department heads to validate the ₹4,999 pilot pricing.
