import Link from "next/link";
import { Card, Check, Empty, F, PageHead, projectOptions, RowForm } from "@/components/ui";
import { ImageField, LinksField, Modal, Submit, TodoCheck } from "@/components/client";
import { syncNotebookNow } from "@/app/(app)/actions";
import { getNotes, getProjects, getTodos, getTz } from "@/lib/data";
import { getGoogle, notebookDocUrl } from "@/lib/google";
import { fmtDate, today } from "@/lib/format";
import { KIND_PATH, NOTE_TAGS, type Note, type Project } from "@/lib/types";

function NoteFields({ note, projects, date, tags }: { note?: Note; projects: Project[]; date: string; tags: string[] }) {
  return (
    <div className="fgrid">
      <F label="Title" name="title" defaultValue={note?.title} required full />
      <F label="Body" name="body" type="textarea" defaultValue={note?.body} full rows={7} />
      <div className="field full">
        <span className="label">Tags</span>
        <input type="hidden" name="_tags" value="1" />
        <div className="row">
          {tags.map((tag) => <label key={tag} className="check"><input type="checkbox" name="tags" value={tag} defaultChecked={note?.tags.includes(tag)} />{tag}</label>)}
        </div>
        <input name="tags_extra" aria-label="Other tags, comma separated" placeholder="Other tags, comma separated" />
      </div>
      <F label="Date" name="noted_on" type="date" defaultValue={note?.noted_on ?? date} required />
      <F label="Linked project" name="project_id" options={projectOptions(projects)} blank="None" defaultValue={note?.project_id} />
      <div className="full"><LinksField defaultValue={note?.links} placeholder="Label (optional)" /></div>
      <div className="full"><ImageField name="image_url" label="Image" defaultValue={note?.image_url} folder="notes" /></div>
      <div className="field full">
        <label htmlFor={`todo-${note?.id ?? "new"}`}>Add a to-do from this note</label>
        <div className="quick">
          <div className="field wide"><input id={`todo-${note?.id ?? "new"}`} name="todo_title" placeholder="Goes onto the to-do list, linked to this note" /></div>
          <div className="field"><input type="date" name="todo_due" aria-label="To-do deadline" /></div>
          <Check label="Urgent" name="todo_urgent" />
        </div>
      </div>
    </div>
  );
}

export default async function Notebook({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const [notes, projects, todos, tz, google, docUrl] = await Promise.all([getNotes(), getProjects(), getTodos(), getTz(), getGoogle(), notebookDocUrl()]);
  const t = today(tz);
  const tags = [...new Set([...NOTE_TAGS, ...notes.flatMap((n) => n.tags)])];
  const list = tag ? notes.filter((n) => n.tags.includes(tag)) : notes;
  return (
    <>
      <PageHead section="notebook" title="Notebook" sub={google
        ? "Every note is also written to a Google Doc, with a tab for each tag."
        : "Capture ideas here. Connect Google in Settings and they'll also be written to a Google Doc with a tab per tag."}>
        {docUrl ? <a className="btn ghost" href={docUrl} target="_blank" rel="noreferrer">Open Google Doc ↗</a> : null}
        {google ? <form action={syncNotebookNow}><Submit className="btn ghost">Sync doc</Submit></form> : null}
        <Modal label="+ Note" title="New note"><RowForm table="notes" submit="Save note"><NoteFields projects={projects} date={t} tags={tags} /></RowForm></Modal>
      </PageHead>

      <nav className="seg" aria-label="Filter by tag">
        <Link href="/notebook" aria-current={!tag}>All · {notes.length}</Link>
        {tags.map((x) => <Link key={x} href={`/notebook?tag=${encodeURIComponent(x)}`} aria-current={tag === x}>{x} · {notes.filter((n) => n.tags.includes(x)).length}</Link>)}
      </nav>

      {list.length ? (
        <div className="notes">
          {list.map((n) => {
            const project = projects.find((p) => p.id === n.project_id);
            const linked = todos.filter((x) => x.note_id === n.id);
            return (
              <article className="note" key={n.id}>
                {n.image_url ? <div className="art" style={{ backgroundImage: `url("${n.image_url}")` }} /> : null}
                <div className="body">
                  <div className="row between">
                    <span className="eyebrow">{fmtDate(n.noted_on, "weekday")}</span>
                    <Modal label="Edit" title="Edit note" className="linklike small" ariaLabel={`Edit ${n.title}`}>
                      <RowForm table="notes" id={n.id} what="this note"><NoteFields note={n} projects={projects} date={t} tags={tags} /></RowForm>
                    </Modal>
                  </div>
                  <h3>{n.title}</h3>
                  {n.body ? <p>{n.body}</p> : null}
                  {n.links?.length ? <div className="row" style={{ gap: 6 }}>{n.links.map((l, i) => <a key={i} className="chip sky" href={l.url} target="_blank" rel="noreferrer">{l.label || new URL(l.url).hostname.replace(/^www\./, "")} ↗</a>)}</div> : null}
                  {linked.length ? (
                    <div className="list" style={{ marginTop: 4 }}>
                      {linked.map((x) => <div key={x.id} className={`item${x.done ? " done" : ""}`} style={{ padding: "6px 0" }}><TodoCheck id={x.id} done={x.done} title={x.title} /><span className="rowtitle small">{x.title}</span></div>)}
                    </div>
                  ) : null}
                  <div className="row" style={{ gap: 6 }}>
                    {n.tags.map((x) => <Link key={x} className="chip" href={`/notebook?tag=${encodeURIComponent(x)}`}>{x}</Link>)}
                    {project ? <Link className="chip leaf" href={KIND_PATH[project.kind]}>{project.title}</Link> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <Card><Empty>{tag ? `No notes tagged “${tag}” yet.` : "No notes yet. Start with “+ Note”."}</Empty></Card>}
    </>
  );
}
