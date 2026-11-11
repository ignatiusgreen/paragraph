import { Card, Empty, F, PageHead, RowForm } from "@/components/ui";
import { ImageField, Modal } from "@/components/client";
import { rows } from "@/lib/data";
import { fmtDate, label, money } from "@/lib/format";
import type { Gear } from "@/lib/types";

const LISTS = [{ value: "inventory", label: "Inventory (we own it)" }, { value: "sell", label: "Sell list" }, { value: "buy", label: "Purchase list" }];
const SELL = ["draft", "listed", "sold"].map((v) => ({ value: v, label: label(v) }));
const PRIORITY = ["high", "medium", "low"].map((v) => ({ value: v, label: label(v) }));

function GearFields({ item, list }: { item?: Gear; list: Gear["list"] }) {
  const l = item?.list ?? list;
  return (
    <div className="fgrid">
      <F label="Item" name="name" defaultValue={item?.name} required /><F label="Category" name="category" defaultValue={item?.category} placeholder="Camera, lens, audio, grip…" />
      <F label="List" name="list" options={LISTS} defaultValue={l} />
      {l === "buy" ? (
        <>
          <F label="Priority" name="priority" options={PRIORITY} blank="—" defaultValue={item?.priority} />
          <F label="Estimated cost" name="est_cost" type="number" defaultValue={item?.est_cost} /><F label="Link to buy" name="buy_url" type="url" defaultValue={item?.buy_url} placeholder="https://…" />
        </>
      ) : (
        <>
          <F label="Serial number" name="serial" defaultValue={item?.serial} />
          <F label="Condition" name="condition" defaultValue={item?.condition} /><F label="Where it lives" name="location" defaultValue={item?.location} />
          <F label="Paid" name="purchase_price" type="number" defaultValue={item?.purchase_price} /><F label="Bought on" name="purchased_on" type="date" defaultValue={item?.purchased_on} />
        </>
      )}
      {l === "sell" ? (
        <>
          <F label="Asking price" name="ask_price" type="number" defaultValue={item?.ask_price} /><F label="Sale status" name="sell_status" options={SELL} defaultValue={item?.sell_status ?? "draft"} />
          <F label="eBay listing link" name="ebay_url" type="url" defaultValue={item?.ebay_url} placeholder="https://www.ebay.com/itm/…" />
          <F label="Facebook Marketplace link" name="fb_url" type="url" defaultValue={item?.fb_url} placeholder="https://www.facebook.com/marketplace/item/…" />
          <F label="Sold for" name="sold_price" type="number" defaultValue={item?.sold_price} />
        </>
      ) : null}
      <div className="full"><ImageField name="image_url" label="Photo" defaultValue={item?.image_url} folder="gear" /></div>
      <F label="Notes" name="notes" type="textarea" defaultValue={item?.notes} full rows={2} />
    </div>
  );
}
const Add = ({ list, text }: { list: Gear["list"]; text: string }) => (
  <Modal label={text} title={text.replace("+ ", "New ")} className="btn sm"><RowForm table="gear" submit="Add"><GearFields list={list} /></RowForm></Modal>
);
const Name = ({ g }: { g: Gear }) => (
  <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
    {g.image_url ? <span className="thumb" style={{ width: 54, height: 40, flex: "none", background: `center/cover url("${g.image_url}")` }} /> : null}
    <div>
      <Modal label={<span className="rowtitle"><strong>{g.name}</strong></span>} title={g.name} className="rowbtn" ariaLabel={`Edit ${g.name}`}>
        <RowForm table="gear" id={g.id} what="this item"><GearFields item={g} list={g.list} /></RowForm>
      </Modal>
      <div className="tiny muted">{[g.category, g.notes].filter(Boolean).join(" · ")}</div>
    </div>
  </div>
);

export default async function GearPage() {
  const gear = await rows<Gear>("gear", "name");
  const inv = gear.filter((g) => g.list === "inventory"), sell = gear.filter((g) => g.list === "sell"), buy = gear.filter((g) => g.list === "buy");
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const selling = sell.filter((g) => g.sell_status !== "sold");
  return (
    <>
      <PageHead section="gear" title="Gear" sub="What the studio owns, what's for sale, and what to buy next." />
      <div className="card pearl">
        <div className="tiles">
          <div className="tile"><span className="tile-label">Inventory</span><span className="tile-value">{inv.length}</span><span className="tile-note">{money(inv.reduce((s, g) => s + Number(g.purchase_price ?? 0), 0), { compact: true })} paid</span></div>
          <div className="tile"><span className="tile-label">For sale</span><span className="tile-value">{selling.length}</span><span className="tile-note">{money(selling.reduce((s, g) => s + Number(g.ask_price ?? 0), 0), { compact: true })} asking</span></div>
          <div className="tile"><span className="tile-label">Sold</span><span className="tile-value">{money(sell.reduce((s, g) => s + Number(g.sell_status === "sold" ? g.sold_price ?? 0 : 0), 0), { compact: true })}</span><span className="tile-note">{sell.length - selling.length} items</span></div>
          <div className="tile"><span className="tile-label">Purchase budget</span><span className="tile-value">{money(buy.reduce((s, g) => s + Number(g.est_cost ?? 0), 0), { compact: true })}</span><span className="tile-note">{buy.length} items wanted</span></div>
        </div>
      </div>

      <Card title={`Inventory · ${inv.length}`} actions={<Add list="inventory" text="+ Item" />}>
        {inv.length ? (
          <div className="tablewrap"><table>
            <thead><tr><th>Item</th><th>Serial</th><th>Condition</th><th>Location</th><th>Bought</th><th className="num">Paid</th></tr></thead>
            <tbody>{inv.map((g) => (
              <tr key={g.id}><td><Name g={g} /></td><td className="muted">{g.serial ?? "—"}</td><td>{g.condition ?? "—"}</td><td>{g.location ?? "—"}</td><td>{g.purchased_on ? fmtDate(g.purchased_on.slice(0, 7), "month") : "—"}</td><td className="num">{money(g.purchase_price)}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <Empty>No gear listed yet.</Empty>}
      </Card>

      <div className="grid">
        <Card className="s6" title={`Sell list · ${sell.length}`} actions={<Add list="sell" text="+ Item to sell" />}>
          <div className="row">
            <span className="eyebrow">eBay</span>
            <a className="btn ghost sm" href="https://www.ebay.com/sl/sell" target="_blank" rel="noreferrer">New listing ↗</a>
            <a className="btn ghost sm" href="https://www.ebay.com/sh/lst/active" target="_blank" rel="noreferrer">Seller Hub ↗</a>
            <span className="eyebrow" style={{ marginLeft: 8 }}>Facebook</span>
            <a className="btn ghost sm" href="https://www.facebook.com/marketplace/create/item" target="_blank" rel="noreferrer">New listing ↗</a>
            <a className="btn ghost sm" href="https://www.facebook.com/marketplace/you/selling" target="_blank" rel="noreferrer">Your listings ↗</a>
          </div>
          {sell.length ? (
            <div className="tablewrap"><table>
              <thead><tr><th>Item</th><th>Status</th><th>Listings</th><th className="num">Asking</th></tr></thead>
              <tbody>{sell.map((g) => (
                <tr key={g.id}>
                  <td><Name g={g} /></td>
                  <td><span className={`chip${g.sell_status === "sold" ? " leaf" : g.sell_status === "listed" ? " sun" : ""}`}>{label(g.sell_status ?? "draft")}</span></td>
                  <td><div className="row" style={{ gap: 6 }}>
                    {g.ebay_url ? <a className="chip sky" href={g.ebay_url} target="_blank" rel="noreferrer">eBay ↗</a> : null}
                    {g.fb_url ? <a className="chip sky" href={g.fb_url} target="_blank" rel="noreferrer">Facebook ↗</a> : null}
                    {!g.ebay_url && !g.fb_url ? <span className="muted">Not listed</span> : null}
                  </div></td>
                  <td className="num">{g.sell_status === "sold" ? <>{money(g.sold_price)}<div className="tiny muted">sold</div></> : money(g.ask_price)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>Nothing for sale. Add an item, or open an inventory item and move it to the sell list.</Empty>}
        </Card>

        <Card className="s6" title={`Purchase list · ${buy.length}`} actions={<Add list="buy" text="+ Item to buy" />}>
          {buy.length ? (
            <div className="tablewrap"><table>
              <thead><tr><th>Item</th><th>Priority</th><th>Link</th><th className="num">Est. cost</th></tr></thead>
              <tbody>{[...buy].sort((a, b) => (order[a.priority ?? ""] ?? 3) - (order[b.priority ?? ""] ?? 3)).map((g) => (
                <tr key={g.id}>
                  <td><Name g={g} /></td>
                  <td>{g.priority ? <span className={`chip${g.priority === "high" ? " urgent" : ""}`}>{label(g.priority)}</span> : <span className="muted">—</span>}</td>
                  <td>{g.buy_url ? <a className="chip sky" href={g.buy_url} target="_blank" rel="noreferrer">{new URL(g.buy_url).hostname.replace(/^www\./, "")} ↗</a> : <span className="muted">—</span>}</td>
                  <td className="num">{money(g.est_cost)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr><td colSpan={3}>Budget needed</td><td className="num">{money(buy.reduce((s, g) => s + Number(g.est_cost ?? 0), 0))}</td></tr></tfoot>
            </table></div>
          ) : <Empty>Nothing on the purchase list.</Empty>}
        </Card>
      </div>
    </>
  );
}
