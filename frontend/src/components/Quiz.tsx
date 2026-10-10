"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useCallback, useState } from "react";

import type { Level, QuizQuestion, Quote, Section } from "@/lib/api";

import { RichText } from "./RichText";

/** Answers are kept in this browser only: { questionId: chosen choice }. */
export type Answers = Record<string, number>;

function storageKey(paperId: string) {
  return `p2l-quiz:${paperId}`;
}

/** The reader's answers for one paper, remembered in the browser so a reload keeps the score. */
export function useQuizAnswers(paperId: string) {
  const [answers, setAnswers] = useState<Answers>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey(paperId)) ?? "{}") as Answers;
    } catch {
      return {};
    }
  });
  const choose = useCallback(
    (questionId: string, choice: number | null) => {
      setAnswers((current) => {
        const next = { ...current };
        if (choice === null) delete next[questionId];
        else next[questionId] = choice;
        try {
          window.localStorage.setItem(storageKey(paperId), JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [paperId],
  );
  return { answers, choose };
}

/** How many of this level's questions were answered, and how many of those correctly. */
export function quizScore(sections: Section[], level: Level, answers: Answers) {
  const questions = sections.flatMap((section) => section.quiz?.[level] ?? []);
  const answered = questions.filter((q) => q.id in answers);
  return {
    total: questions.length,
    answered: answered.length,
    right: answered.filter((q) => answers[q.id] === q.answer).length,
  };
}

/** One check-yourself question. Exported so the home page can show a real one. */
export function Question({
  question,
  number,
  quote,
  pdfUrl,
  chosen,
  onChoose,
}: {
  question: QuizQuestion;
  number: number;
  quote: Quote | null;
  pdfUrl: string | null;
  chosen: number | undefined;
  onChoose: (choice: number | null) => void;
}) {
  const answered = chosen !== undefined;
  const right = chosen === question.answer;
  const href = quote && pdfUrl ? `${pdfUrl}#page=${quote.page}` : null;
  return (
    <fieldset className="space-y-3">
      <legend className="text-[0.9375rem] leading-relaxed font-medium">
        <span className="mr-1.5 text-muted tabular-nums">{number}.</span>
        <RichText text={question.question} inline />
      </legend>
      <div className="grid gap-2">
        {question.choices.map((choice, index) => {
          const isAnswer = index === question.answer;
          const isChosen = index === chosen;
          let tone = "border-line bg-surface hover:border-claret-300 dark:hover:border-claret-800";
          if (answered && isAnswer)
            tone = "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
          else if (answered && isChosen)
            tone = "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
          else if (answered) tone = "border-line bg-surface text-muted";
          return (
            <button
              key={choice}
              type="button"
              disabled={answered}
              aria-pressed={isChosen}
              onClick={() => onChoose(index)}
              className={`flex min-h-10 items-start gap-2.5 rounded-md border px-3 py-2 text-left text-[0.9375rem] transition-colors disabled:cursor-default ${tone}`}
            >
              <span className="flex h-6 w-4 shrink-0 items-center text-[0.8125rem] font-semibold" aria-hidden>
                {answered && isAnswer ? (
                  <Check className="h-4 w-4" />
                ) : answered && isChosen ? (
                  <X className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>
              <span>
                {/* Maths alone doesn't count as a button name for every screen reader. */}
                <span className="sr-only">Choice {String.fromCharCode(65 + index)}: </span>
                <RichText text={choice} inline />
                {answered && isAnswer && <span className="sr-only"> (the right answer)</span>}
                {answered && isChosen && !isAnswer && <span className="sr-only"> (your answer)</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <div className="space-y-2 rounded-md bg-sunken px-4 py-3 text-sm leading-relaxed">
            <p>
              <span className="font-semibold">{right ? "Right. " : "Not quite. "}</span>
              <RichText text={question.why} inline />
            </p>
            {quote ? (
              <p className="text-muted">
                The paper says: <span className="font-serif italic">&ldquo;{quote.text}&rdquo;</span>{" "}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    Page {quote.page}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : (
                  <span className="whitespace-nowrap">(page {quote.page})</span>
                )}
              </p>
            ) : (
              <p className="text-muted">This comes from the explanation of this section above.</p>
            )}
            <button type="button" onClick={() => onChoose(null)} className="btn btn-ghost btn-sm -ml-2">
              Try again
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}

/** A few questions at the end of a section, at the reader's level, to check it sank in. */
export function Quiz({
  section,
  level,
  pdfUrl,
  answers,
  onChoose,
}: {
  section: Section;
  level: Level;
  pdfUrl: string | null;
  answers: Answers;
  onChoose: (questionId: string, choice: number | null) => void;
}) {
  const questions = section.quiz?.[level] ?? [];
  if (questions.length === 0) return null;
  const right = questions.filter((q) => answers[q.id] === q.answer).length;
  const done = questions.every((q) => q.id in answers);
  return (
    <section className="card mt-8 p-5 sm:p-6" aria-labelledby={`${section.id}-quiz`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`${section.id}-quiz`} className="text-[0.9375rem] font-semibold">
          Check yourself
        </h3>
        {done && (
          <span className="text-[0.8125rem] text-muted">
            {right} of {questions.length} right
          </span>
        )}
      </div>
      <div className="mt-5 space-y-6">
        {questions.map((question, index) => (
          <Question
            key={question.id}
            question={question}
            number={index + 1}
            quote={question.quote === null ? null : (section.quotes[question.quote] ?? null)}
            pdfUrl={pdfUrl}
            chosen={answers[question.id]}
            onChoose={(choice) => onChoose(question.id, choice)}
          />
        ))}
      </div>
    </section>
  );
}
