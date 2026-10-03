import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";

const html = htm.bind(React.createElement);

const DATA_BASE = "static/data/";
const CODE_FIELD = "code";
const CODE_BASE =
  "https://github.com/GoFungible/gofungible-suite-interop/blob/main/contracts/";

interface DatasetEntry {
  id: string;
  type: string;
  name: string;
  url: string;
  [key: string]: string | undefined;
}

interface Dataset {
  key: string;
  label: string;
  blurb: string;
}

const DATASETS: Dataset[] = [
  {
    key: "relayers",
    label: "Relayers",
    blurb: "Operators that carry messages between chains.",
  },
  {
    key: "routers",
    label: "Routers",
    blurb: "Networks that steer traffic across the interop stack.",
  },
  {
    key: "provers",
    label: "Provers",
    blurb: "Actors that attest to state transitions.",
  },
  {
    key: "validators",
    label: "Validators",
    blurb: "Operators securing the networks above them.",
  },
  {
    key: "escrow",
    label: "Escrow",
    blurb: "Custodied lockboxes backing native issuance.",
  },
];

const STATUS_COLORS: Record<string, string> = {
  TRUSTED: "#3fb950",
  TRUSTMINIMIZED: "#d29922",
  TRUSTLESS: "#f85149",
};

function isBlank(value: string | undefined): boolean {
  return value === undefined || value === "" || value === "-";
}

interface FieldProps {
  k: string;
  v: string | undefined;
}

function resolveCodeHref(value: string): string | null {
  const path = value.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return CODE_BASE + path.replace(/^\/+/, "");
}

function CodeIcon() {
  return html`<svg
    className="code-icon"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M5.8 3.4 1.9 8l3.9 4.6M10.2 3.4 14.1 8l-3.9 4.6M9.3 2.2 6.7 13.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>`;
}

function Field({ k, v }: FieldProps) {
  const codeHref = k === CODE_FIELD && v !== undefined ? resolveCodeHref(v) : null;
  return html`
    <div className="field">
      <span className="field-k">${k}</span>
      ${codeHref
        ? html`<a
            className="field-v code-link"
            href=${codeHref}
            target="_blank"
            rel="noreferrer"
            title=${String(v)}
            aria-label=${"Source code: " + String(v)}
          >
            <${CodeIcon} />
          </a>`
        : html`<span className="field-v">${isBlank(v) ? "—" : String(v)}</span>`}
    </div>`;
}

interface BadgeProps {
  value: string;
}

function Badge({ value }: BadgeProps) {
  const color = STATUS_COLORS[value];
  return html`<span className="badge" style=${color ? { color, borderColor: color } : undefined}>${value}</span>`;
}

interface CardProps {
  entry: DatasetEntry;
  showCode: boolean;
}

function Card({ entry, showCode }: CardProps) {
  const { name, url, type: _type, trust, model, ...rest } = entry;
  const status = trust ?? model;
  const fields: [string, string | undefined][] = Object.entries(rest);
  if (showCode && !fields.some(([k]) => k === CODE_FIELD)) fields.push([CODE_FIELD, undefined]);
  return html`
    <article className="card">
      <div className="card-header">
        <h3>${name || "(unnamed)"}</h3>
        ${url && html`<a className="card-link" href=${url} target="_blank" rel="noreferrer" title=${url}>↗</a>`}
      </div>
      ${!isBlank(status) && html`<div className="badges"><${Badge} value=${String(status)} /></div>`}
      <dl className="fields">
        ${fields.map(([k, v]) => html`<${Field} key=${k} k=${k} v=${v} />`)}
      </dl>
    </article>`;
}

interface SidebarProps {
  total: number;
  counts: Record<string, number> | null;
}

function Sidebar({ total, counts }: SidebarProps) {
  return html`
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">RL</div>
        <h1>Relayer List</h1>
        <p className="brand-tag">
          An open map of the actors behind stablecoin bridges — relayers, routers,
          provers, validators and escrow.
        </p>
      </div>
      <dl className="stats">
        <div><dt>Datasets</dt><dd>${DATASETS.length}</dd></div>
        <div><dt>Actors</dt><dd>${counts ? total : "—"}</dd></div>
      </dl>
      <div className="sidebar-block">
        <h2>Datasets</h2>
        <ul className="dataset-list">
          ${DATASETS.map(
            (d) => html`<li key=${d.key}>
              <span>${d.label}</span>
              <span className="dataset-count">${counts ? counts[d.key] ?? 0 : "—"}</span>
            </li>`
          )}
        </ul>
      </div>
    </aside>`;
}

interface TabsProps {
  dataset: string;
  counts: Record<string, number> | null;
  onSelect: (key: string) => void;
}

function Tabs({ dataset, counts, onSelect }: TabsProps) {
  return html`
    <div className="tabs" role="tablist" aria-label="Dataset">
      ${DATASETS.map(
        (d) => html`<button
          key=${d.key}
          type="button"
          role="tab"
          aria-selected=${d.key === dataset}
          className=${"tab" + (d.key === dataset ? " tab-active" : "")}
          onClick=${() => onSelect(d.key)}
        >
          ${d.label}
          ${counts && html`<span className="tab-count">${counts[d.key] ?? 0}</span>`}
        </button>`
      )}
    </div>`;
}

function App() {
  const [dataset, setDataset] = useState(DATASETS[0].key);
  const [data, setData] = useState<Record<string, DatasetEntry[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      DATASETS.map(async (d): Promise<[string, DatasetEntry[]]> => {
        const response = await fetch(DATA_BASE + d.key + ".json");
        if (!response.ok) throw new Error(d.key + ": HTTP " + response.status);
        const payload = (await response.json()) as unknown;
        if (!Array.isArray(payload)) throw new Error(d.key + ": expected a JSON array");
        return [d.key, payload as DatasetEntry[]];
      })
    )
      .then((pairs) => {
        if (!cancelled) setData(Object.fromEntries(pairs));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = data ? data[dataset] ?? null : null;
  const showCode = entries ? entries.some((e) => CODE_FIELD in e) : false;
  const counts: Record<string, number> | null = data
    ? Object.fromEntries(Object.entries(data).map(([key, list]) => [key, list.length]))
    : null;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  const active = DATASETS.find((d) => d.key === dataset) ?? DATASETS[0];

  return html`
    <div className="app">
      <${Sidebar} total=${total} counts=${counts} />
      <main className="content">
        <header className="content-head">
          <div>
            <h2>${active.label}</h2>
            <p className="blurb">${active.blurb}</p>
          </div>
          <p className="count">${counts ? `${counts[dataset] ?? 0} actors` : ""}</p>
        </header>
        <${Tabs} dataset=${dataset} counts=${counts} onSelect=${setDataset} />
        ${error && html`<p className="error">Failed to load ${DATA_BASE}*.json — ${error}</p>`}
        ${!error && !data && html`<p className="status">Loading…</p>`}
        ${!error && entries && entries.length === 0 && html`<p className="status">No entries in this dataset.</p>`}
        ${!error && entries && entries.length > 0 && html`
          <section className="grid">
            ${entries.map((entry, i) => html`<${Card} key=${i} entry=${entry} showCode=${showCode} />`)}
          </section>`}
      </main>
    </div>`;
}

const container = document.getElementById("root");
if (!container) throw new Error("missing #root element");
createRoot(container).render(html`<${App} />`);