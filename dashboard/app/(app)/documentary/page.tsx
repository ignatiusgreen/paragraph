import { Board, NewProject, PageHead } from "@/components/ui";
import { loadPrivacy } from "@/lib/privacy";
import { getClients, getProjects, getTodos } from "@/lib/data";
import { STAGES } from "@/lib/types";

export default async function Documentary() {
  await loadPrivacy();
  const [projects, clients, todos] = await Promise.all([getProjects(), getClients(), getTodos()]);
  const groups = [...new Set(STAGES.documentary.map((s) => s.group!))];
  return (
    <>
      <PageHead section="documentary" title="Documentary" sub="Films in development and in production. Open a project to move it along or add key art.">
        <NewProject kind="documentary" clients={clients} />
      </PageHead>
      {groups.map((g) => {
        const stages = STAGES.documentary.filter((s) => s.group === g);
        const n = projects.filter((p) => p.kind === "documentary" && stages.some((s) => s.value === p.stage)).length;
        return (
          <section key={g} className="stack">
            <h2 className="card-title">{g} · {n}</h2>
            <Board kind="documentary" stages={stages} projects={projects} clients={clients} todos={todos} />
          </section>
        );
      })}
    </>
  );
}
