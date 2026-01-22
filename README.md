# AI Knowledge Quiz (AI Quiz Master)

A lightweight, web-based quiz generator that turns a user-provided topic into a 5-question multiple-choice quiz, grades the user’s responses, provides answer explanations, and persists quiz history for later review.


## Live Demo

You can try the live demo here:

👉 **https://knowledge-quiz-ai.lovable.app**

The demo showcases the full MVP flow:
- Enter a topic
- Generate a 5-question multiple-choice quiz
- Submit answers and receive a score with explanations
- Review persisted quiz history

## Demo Capabilities (MVP Scope)

- Topic input → generates **5 multiple-choice questions**
- Each question has **4 options (A–D)** with **exactly one correct answer**
- Users can select answers and submit
- App returns:
  - Score (e.g., **3/5**)
  - Correct answers
  - Explanations for why answers are correct/incorrect
- Quiz attempts are **persisted** so users can review past quizzes

## Tech Stack

- **Frontend**: React + TypeScript
- **Persistence**: Supabase (PostgreSQL) for storing quizzes and attempts
- **LLM for Quiz generation**
- **Wikipedia API for enriched context**
- **Zod Validation for safe LLM response**
- **Edge function for API routes**




## High-Level System Architecture

The app is composed of four main subsystems:

1. **Client UI**  
   - Topic input, quiz-taking UI, results view, and history view.
2. **Quiz Orchestration Layer (Client-side service/module)**  
   - Coordinates quiz generation requests, state transitions, and submission.
3. **AI Generation Provider (LLM API)**  
   - Produces quiz questions + correct answers + explanations in a strict structured format.
4. **Persistence Layer (Supabase Postgres)**  
   - Stores quizzes, questions, and user attempts/results for history/review.
  

## Key Design Decisions & Tradeoffs

The following decisions reflect explicit tradeoffs between **accuracy, performance, safety, and development velocity**.

---

### 1) One LLM Call per Quiz (Performance + Cost)

**Decision**  
Generate the entire quiz (questions, answer options, correct answers, and explanations) in a **single LLM call**.

**Why**
- Minimizes latency and API cost
- Avoids multi-call orchestration complexity
- Keeps the demo experience fast and reliable

**Tradeoff**
- Explanations are generic per question and not always tailored to the user’s specific incorrect choice
- Option-specific feedback would typically require a second LLM call at grading time

---

### 2) Store Correct Answers at Generation Time (Fast Grading)

**Decision**  
Persist `correctOption` and `explanation` with each question at generation time.

**Why**
- Grading becomes deterministic and instantaneous
- Eliminates grading-time hallucinations
- Makes quiz attempts reproducible and auditable

**Tradeoff**
- If the LLM produces a flawed correct answer, it becomes “locked in” unless the quiz is regenerated  
- **Mitigation:** add validation checks (see *Accuracy Strategy* below)

---

### 3) Lightweight Retrieval / Context Injection (Accuracy Without Complexity)

**Decision**  
Use a minimal retrieval approach (e.g., Wikipedia summary or short context injection) instead of a full vector-based RAG pipeline.

**Why**
- Significant accuracy improvement over topic-only prompting
- Very low implementation overhead
- Keeps token usage and latency bounded

**Tradeoff**
- Less robust for niche topics or subjects with ambiguous or disputed information

---

### 4) Supabase for Persistence (MVP Velocity)

**Decision**  
Use **Supabase Postgres** to store quizzes and quiz attempts.

**Why**
- Fast setup and minimal operational overhead
- Enables durable quiz history and result review
- Fits MVP requirements well using a simple relational model

**Tradeoff**
- At larger scale, transactional storage (Postgres) may need to be separated from retrieval storage (vector DB / pgvector)

---

## Accuracy Strategy

Accuracy is addressed through a combination of:

- **Context injection**: retrieved reference text is used as grounding material
- **Constrained prompting**: instructions require exactly 5 questions, 4 options, and a single correct answer
- **Structured output expectations**: questions must be parseable and consistent
- **Deterministic grading**: once generated, scoring is performed by code rather than the model

---

## Practical Guardrails

If this project is extended beyond MVP, the following safeguards are recommended:

- Schema validation of LLM output (e.g., using Zod)
- Sanity checks:
  - Each question has exactly 4 options
  - `correct ∈ {A, B, C, D}`
  - No duplicate answer keys
  - Explanations are non-empty
- Regenerate once on validation failure, then fail gracefully

---

## Safety Strategy (Input & Output)

The MVP includes basic safety controls:

- **Input filtering**: reject empty or overlong topics and disallow clearly inappropriate topics
- **Output filtering**: ensure generated content remains within acceptable educational bounds

### Tradeoff: MVP vs. Production Safety

**MVP Safety**
- Strict prompting
- Minimal input filtering

**Production Safety**
- Dedicated moderation endpoint calls (e.g., OpenAI moderation)
- Audit logging and rate limiting
- Explicit policy handling (medical, legal, self-harm, etc.)

---

## AI Tooling Selection & Reasoning

### Primary AI Tool: OpenAI-Compatible LLM API (Configurable)

Quiz generation uses an LLM capable of reliably following strict instructions to return:
- 5 factual questions
- Four labeled options (A–D)
- Exactly one correct answer
- An explanation for each question

**Why this class of model**
- Strong instruction-following for structured outputs
- Broad general-knowledge coverage
- Fast iteration via API keys and environment configuration

**Operational Reasoning**
The system is optimized for **single-call generation** and **deterministic grading**, which:
- Reduces complexity
- Improves performance
- Makes the system easier to explain and debug during a demo

---

### Retrieval Tool: Wikipedia / Public Reference Source (Lightweight)

**Why**
- Improves factual grounding for common topics
- Lower complexity than full RAG
- Keeps latency and costs low

---

## Data Model / Entities

Typical entities stored:

**Quizzes**
- `id`
- `topic`
- `wikipedia_context`
- `questions`
- `createdAt`

**Attempt**
- `quizId`
- `answers`
- `score`
- `createdAt`

**API**
- POST /generate-quiz  { topic, forceNew? }
- POST /sumit-quiz {quizId, answers}
- GET /quiz/{quizId}
- GET/Attempt/{quizId}
- GET/History


---

## Local Development

### Prerequisites
- Node.js (LTS recommended)
- Supabase project (or local Supabase)
- LLM API key

### Request Flow (Generate Quiz)


  
  ```text
  [User Topic Input]
         |
         v
  [Input Validation + Safety Checks]
         |
         v
  [Context Retrieval (Optional / Lightweight)]
         |
         v
  [LLM Quiz Generation]
    - returns strict structured output (JSON-like)
         |
         v
  [Persist Quiz + Questions in Supabase]
         |
         v
  [Render Quiz UI]
  
  
  [User Submits Answers]
         |
         v
  [Local Grading (no extra LLM call required)]
         |
         v
  [Persist Attempt + Score in Supabase]
         |
         v
  [Render Results (score + correct + explanations)]







