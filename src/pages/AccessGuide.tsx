import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Search,
  Sparkles,
  TableOfContents,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import guideMarkdown from "../../GUIA_DO_USUARIO.md?raw";
import { ContentCard, PageWrapper } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

type HeadingBlock = {
  type: "heading";
  level: number;
  text: string;
  id: string;
};

type ParagraphBlock = {
  type: "paragraph";
  text: string;
};

type QuoteBlock = {
  type: "quote";
  text: string;
};

type ListBlock = {
  type: "list";
  ordered: boolean;
  items: string[];
};

type CodeBlock = {
  type: "code";
  code: string;
};

type TableBlock = {
  type: "table";
  headers: string[];
  rows: string[][];
};

type DividerBlock = {
  type: "divider";
};

type Block = HeadingBlock | ParagraphBlock | QuoteBlock | ListBlock | CodeBlock | TableBlock | DividerBlock;

type GuideSection = {
  heading: HeadingBlock;
  blocks: Block[];
};

function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+[—–-]\s+/g, "--")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{3,}/g, "--");
}

function isDivider(line: string) {
  return /^-{3,}$/.test(line.trim());
}

function isTableSeparator(line: string) {
  return /^\|\s*[-:| ]+\|\s*$/.test(line.trim());
}

function isListItem(line: string) {
  return /^\s*(?:[-*]|\d+\.)\s+/.test(line);
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseMarkdown(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const text = headingMatch[2].trim();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text,
        id: slugifyHeading(text),
      });
      index += 1;
      continue;
    }

    if (isDivider(line)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (trimmed.startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = parseTableRow(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (isListItem(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];

      while (index < lines.length && isListItem(lines[index])) {
        let itemText = lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();
        index += 1;

        while (
          index < lines.length &&
          lines[index].trim() &&
          !isListItem(lines[index]) &&
          !/^(#{1,6})\s+/.test(lines[index]) &&
          !/^```/.test(lines[index].trim()) &&
          !lines[index].trim().startsWith("|") &&
          !/^>\s?/.test(lines[index].trim()) &&
          !isDivider(lines[index])
        ) {
          itemText += ` ${lines[index].trim()}`;
          index += 1;
        }

        items.push(itemText);
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^```/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith("|") &&
      !/^>\s?/.test(lines[index].trim()) &&
      !isDivider(lines[index]) &&
      !isListItem(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string) {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-text-${matchIndex}`}>
          {text.slice(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    if (match[1] && match[2]) {
      const href = match[2];
      const normalizedHref = href.startsWith("#") ? `#${slugifyHeading(href.slice(1))}` : href;
      const external = /^https?:\/\//i.test(normalizedHref);
      nodes.push(
        <a
          key={`${keyPrefix}-link-${matchIndex}`}
          href={normalizedHref}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="font-black text-develoi-navy underline decoration-develoi-gold/70 underline-offset-4 transition-colors hover:text-develoi-gold"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${matchIndex}`} className="font-black text-zinc-900">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.92em] font-black text-develoi-navy"
        >
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-tail`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return nodes;
}

function renderBlock(block: Block, blockIndex: number) {
  switch (block.type) {
    case "heading":
      if (block.level === 3) {
        return (
          <h3
            key={`block-${blockIndex}`}
            id={block.id}
            className="scroll-mt-28 pt-2 text-xl font-black tracking-tight text-zinc-900"
          >
            {block.text}
          </h3>
        );
      }

      if (block.level >= 4) {
        return (
          <h4
            key={`block-${blockIndex}`}
            id={block.id}
            className="scroll-mt-28 pt-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500"
          >
            {block.text}
          </h4>
        );
      }

      return null;

    case "paragraph":
      return (
        <p key={`block-${blockIndex}`} className="text-[15px] leading-7 text-zinc-700">
          {renderInline(block.text, `paragraph-${blockIndex}`)}
        </p>
      );

    case "quote":
      return (
        <div
          key={`block-${blockIndex}`}
          className="rounded-[28px] border border-develoi-gold/20 bg-[#fff8e8] px-5 py-4 text-[14px] leading-7 text-zinc-700"
        >
          {renderInline(block.text, `quote-${blockIndex}`)}
        </div>
      );

    case "list":
      if (block.ordered) {
        return (
          <ol key={`block-${blockIndex}`} className="space-y-3 pl-6 text-[15px] leading-7 text-zinc-700 list-decimal">
            {block.items.map((item, itemIndex) => (
              <li key={`ordered-${blockIndex}-${itemIndex}`}>
                {renderInline(item, `ordered-${blockIndex}-${itemIndex}`)}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <ul key={`block-${blockIndex}`} className="space-y-3 pl-6 text-[15px] leading-7 text-zinc-700 list-disc marker:text-develoi-gold">
          {block.items.map((item, itemIndex) => (
            <li key={`unordered-${blockIndex}-${itemIndex}`}>
              {renderInline(item, `unordered-${blockIndex}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <div key={`block-${blockIndex}`} className="overflow-hidden rounded-[28px] border border-zinc-900 bg-zinc-950">
          <pre className="overflow-x-auto px-5 py-4 text-[13px] leading-6 text-zinc-100">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case "table":
      return (
        <div key={`block-${blockIndex}`} className="overflow-hidden rounded-[28px] border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-left">
                  {block.headers.map((header, headerIndex) => (
                    <th
                      key={`thead-${blockIndex}-${headerIndex}`}
                      className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                    >
                      {renderInline(header, `thead-${blockIndex}-${headerIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`row-${blockIndex}-${rowIndex}`} className="border-t border-zinc-200 bg-white">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`cell-${blockIndex}-${rowIndex}-${cellIndex}`}
                        className="px-4 py-3 text-[14px] leading-6 text-zinc-700 align-top"
                      >
                        {renderInline(cell, `cell-${blockIndex}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "divider":
      return <div key={`block-${blockIndex}`} className="h-px w-full bg-zinc-200" />;

    default:
      return null;
  }
}

export default function AccessGuide() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [activeAnchor, setActiveAnchor] = useState(() =>
    typeof window !== "undefined" ? window.location.hash.replace("#", "") : ""
  );

  const blocks = useMemo(() => parseMarkdown(guideMarkdown), []);

  const pageMeta = useMemo(() => {
    const title = blocks.find((block): block is HeadingBlock => block.type === "heading" && block.level === 1);
    const subtitle = blocks.find((block): block is HeadingBlock => block.type === "heading" && block.level === 3);
    const lead = blocks.find((block): block is QuoteBlock => block.type === "quote");
    return {
      title: title?.text || "Guia de Acesso",
      subtitle: subtitle?.text || "Manual completo da plataforma",
      lead: lead?.text || "",
    };
  }, [blocks]);

  const sections = useMemo(() => {
    const firstSectionIndex = blocks.findIndex((block) => block.type === "heading" && block.level === 2);
    const introBlocks = (firstSectionIndex >= 0 ? blocks.slice(0, firstSectionIndex) : blocks).filter((block) => {
      if (block.type === "heading" && (block.level === 1 || block.level === 3)) {
        return false;
      }
      if (block.type === "quote" && block.text === pageMeta.lead) {
        return false;
      }
      return true;
    });

    const mappedSections: GuideSection[] = [];
    let currentSection: GuideSection | null = null;

    for (const block of blocks.slice(firstSectionIndex >= 0 ? firstSectionIndex : blocks.length)) {
      if (block.type === "heading" && block.level === 2) {
        currentSection = { heading: block, blocks: [] };
        mappedSections.push(currentSection);
        continue;
      }

      currentSection?.blocks.push(block);
    }

    const guideSections = mappedSections.filter((section) => section.heading.text !== "Índice");

    return { introBlocks, mappedSections: guideSections };
  }, [blocks, pageMeta.lead]);

  const navSections = useMemo(() => {
    return sections.mappedSections.map((section) => ({
      id: section.heading.id,
      title: section.heading.text,
      children: section.blocks
        .filter((block): block is HeadingBlock => block.type === "heading" && block.level === 3)
        .map((block) => ({ id: block.id, title: block.text })),
    }));
  }, [sections.mappedSections]);

  const filteredNavSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return navSections;
    }

    return navSections
      .map((section) => {
        const sectionMatch = section.title.toLowerCase().includes(normalizedQuery);
        const children = section.children.filter((child) => child.title.toLowerCase().includes(normalizedQuery));
        return {
          ...section,
          children,
          visible: sectionMatch || children.length > 0,
        };
      })
      .filter((section) => section.visible)
      .map(({ visible, ...section }) => section);
  }, [navSections, query]);

  const stats = useMemo(() => {
    const moduleCount = sections.mappedSections.length;
    const topicCount = blocks.filter((block) => block.type === "heading" && block.level >= 3).length;
    const resourceCount = blocks.filter((block) => block.type === "table" || block.type === "code").length;

    return [
      { label: "Módulos", value: moduleCount.toString().padStart(2, "0"), icon: <BookOpen size={18} /> },
      { label: "Tópicos", value: topicCount.toString().padStart(2, "0"), icon: <TableOfContents size={18} /> },
      { label: "Tabelas e Fluxos", value: resourceCount.toString().padStart(2, "0"), icon: <FileText size={18} /> },
    ];
  }, [blocks, sections.mappedSections]);

  useEffect(() => {
    const currentHash = location.hash.replace("#", "");
    setActiveAnchor(currentHash);

    if (!currentHash) {
      return;
    }

    const timeout = window.setTimeout(() => {
      document.getElementById(currentHash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [location.hash]);

  useEffect(() => {
    const handler = () => setActiveAnchor(window.location.hash.replace("#", ""));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const handleJump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    setActiveAnchor(id);
    window.history.replaceState(null, "", `#${id}`);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageWrapper className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[36px] bg-develoi-navy px-6 py-7 text-white shadow-[0_24px_70px_rgba(7,21,43,0.18)] sm:px-8">
          <div className="absolute inset-0">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(197,160,77,0.24),transparent_55%)]" />
            <div className="absolute -right-16 top-12 h-48 w-48 rounded-full bg-develoi-gold/12 blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-develoi-gold">
                  <Sparkles size={12} />
                  Central de aprendizado
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {pageMeta.title}
                </h1>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
                  {pageMeta.subtitle}
                </p>
                <p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/78">
                  {renderInline(pageMeta.lead, "hero-lead")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-white/10 bg-white/7 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">{stat.icon}</span>
                      <span className="text-2xl font-black tracking-tight text-white">{stat.value}</span>
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <ContentCard className="overflow-hidden rounded-[32px] border-zinc-200 p-0 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="border-b border-zinc-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfd_100%)] px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-develoi-navy text-white shadow-lg shadow-develoi-navy/15">
                    <TableOfContents size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-tight text-zinc-900">Índice do Guia</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      Navegação rápida
                    </p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar seção do manual"
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-bold text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold focus:bg-white"
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto bg-[linear-gradient(180deg,#fcfcfd_0%,#f7f7fa_100%)] px-3 py-3">
                <div className="space-y-2">
                  {filteredNavSections.map((section) => (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-[22px] border p-2 transition-all",
                        activeAnchor === section.id || section.children.some((child) => child.id === activeAnchor)
                          ? "border-develoi-gold/25 bg-[#fff7e6] shadow-[0_10px_24px_rgba(197,160,77,0.12)]"
                          : "border-transparent bg-white/60 hover:border-zinc-200 hover:bg-white"
                      )}
                    >
                      <a
                        href={`#${section.id}`}
                        onClick={(event) => handleJump(event, section.id)}
                        className={cn(
                          "block rounded-2xl px-3 py-2.5 text-[12px] font-black tracking-[0.02em] transition-colors",
                          activeAnchor === section.id || section.children.some((child) => child.id === activeAnchor)
                            ? "text-develoi-navy"
                            : "text-zinc-800 hover:text-develoi-navy"
                        )}
                      >
                        {section.title}
                      </a>
                      {section.children.length > 0 && (
                        <div className="space-y-1 pb-1 pl-3">
                          {section.children.map((child) => (
                            <a
                              key={child.id}
                              href={`#${child.id}`}
                              onClick={(event) => handleJump(event, child.id)}
                              className={cn(
                                "block rounded-xl px-3 py-2 text-[11px] font-bold transition-colors",
                                activeAnchor === child.id
                                  ? "bg-white text-develoi-navy shadow-sm"
                                  : "text-zinc-500 hover:bg-white hover:text-develoi-navy"
                              )}
                            >
                              {child.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ContentCard>

            <ContentCard className="rounded-[30px] border-zinc-200 bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] shadow-[0_12px_30px_rgba(197,160,77,0.08)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-develoi-gold/18 text-develoi-gold">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-zinc-900">Base oficial do sistema</p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-600">
                    Esta página usa o conteúdo completo do arquivo <code className="rounded bg-white px-1.5 py-0.5 font-black text-develoi-navy">GUIA_DO_USUARIO.md</code> como referência principal.
                  </p>
                </div>
              </div>
            </ContentCard>
          </aside>

          <div className="space-y-6">
            {sections.introBlocks.length > 0 && (
              <ContentCard className="space-y-5 rounded-[32px] border-zinc-200 px-6 py-6 sm:px-8">
                {sections.introBlocks.map((block, blockIndex) => renderBlock(block, blockIndex))}
              </ContentCard>
            )}

            {sections.mappedSections.map((section, sectionIndex) => (
              <ContentCard
                key={section.heading.id}
                className="space-y-5 rounded-[32px] border-zinc-200 px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-8"
              >
                <div
                  id={section.heading.id}
                  className="scroll-mt-24 border-b border-zinc-100 pb-5"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
                    Seção {String(sectionIndex + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                    {section.heading.text}
                  </h2>
                </div>

                <div className="space-y-5">
                  {section.blocks.map((block, blockIndex) => renderBlock(block, blockIndex))}
                </div>
              </ContentCard>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
