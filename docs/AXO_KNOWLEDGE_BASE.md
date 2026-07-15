# AXO Knowledge Base

Approved records live in `lib/axo/knowledge.ts` with title, answer, category, source page, review date, status and audience. V1 is deterministic and searches only these records.

Unknown-answer copy is fixed: "I do not have an approved answer for that yet. I can help you send the question to the WriteX support team."

Future AI retrieval must filter to approved records, cite the source record internally, reject instructions embedded in visitor content or uploaded files, and fall back when confidence is insufficient.
