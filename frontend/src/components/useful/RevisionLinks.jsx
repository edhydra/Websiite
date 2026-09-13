import { ExternalLink } from "lucide-react";

const LINKS = [
  { name: "Seneca Learning", url: "https://senecalearning.com", note: "free courses + smart revision for GCSE & A-level" },
  { name: "Computing Covered", url: "https://computingcovered.com", note: "computer science topics covered properly" },
  { name: "Corbettmaths", url: "https://corbettmaths.com", note: "maths videos, worksheets and 5-a-day practice" },
  { name: "MathsWatch", url: "https://vle.mathswatch.co.uk", note: "maths videos + assignments (school login)" },
  { name: "BBC Bitesize", url: "https://www.bbc.co.uk/bitesize", note: "every subject, broken into small chunks" },
  { name: "Khan Academy", url: "https://www.khanacademy.org", note: "full courses, maths and science especially" },
  { name: "Desmos Graphing", url: "https://www.desmos.com/calculator", note: "graph anything, instantly" },
  { name: "Save My Exams", url: "https://www.savemyexams.com", note: "revision notes and past-paper questions by board" },
  { name: "Quizlet", url: "https://quizlet.com", note: "flashcard sets for basically every topic" },
  { name: "Microsoft Word (online)", url: "https://www.office.com/launch/word", note: "write your essay in the browser, free" },
  { name: "Physics & Maths Tutor", url: "https://www.physicsandmathstutor.com", note: "past papers sorted by topic" },
  { name: "Google Scholar", url: "https://scholar.google.com", note: "proper sources for coursework references" },
];

export default function RevisionLinks() {
  return (
    <div className="eb-tool" data-testid="tool-links">
      <p className="eb-section-sub">the sites that actually help. opens in a new tab.</p>
      <div className="eb-rev-grid">
        {LINKS.map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="eb-rev-card"
            data-testid={`rev-${l.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          >
            <div className="eb-rev-name">{l.name} <ExternalLink size={13} /></div>
            <div className="eb-rev-note">{l.note}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
