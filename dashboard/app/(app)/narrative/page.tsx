import { Board, NewProject, PageHead } from "@/components/ui";
import { getClients, getProjects, getTodos } from "@/lib/data";
import { STAGES } from "@/lib/types";

export default async function Narrative() {
  const [projects, clients, todos] = await Promise.all([getProjects(), getClients(), getTodos()]);
  return (
    <>
      <PageHead section="narrative" title="Narrative" sub="Scripted projects in development and on the page right now.">
        <NewProject kind="narrative" clients={clients} />
      </PageHead>
      <Board kind="narrative" stages={STAGES.narrative} projects={projects} clients={clients} todos={todos} />
    </>
  );
}
