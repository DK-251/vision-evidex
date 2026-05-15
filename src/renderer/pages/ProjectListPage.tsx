import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import {
  AddRegular,
  SearchRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { Button, FluentSkeleton } from '../components/ui';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useToast } from '../providers/ToastProvider';
import type { RecentProject } from '@shared/types/entities';

/**
 * S-13 — Project list.
 *
 * §9 redesign: card grid with gradient background per card, project icon,
 * title, client name, description excerpt. Search bar at top.
 */

// Deterministic vivid gradient per project name — richer, more saturated for premium feel
const GRADIENTS = [
  'linear-gradient(145deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(145deg, #f093fb 0%, #c44569 100%)',
  'linear-gradient(145deg, #4facfe 0%, #0969DA 100%)',
  'linear-gradient(145deg, #43e97b 0%, #0E7A0D 100%)',
  'linear-gradient(145deg, #fa709a 0%, #e84393 100%)',
  'linear-gradient(145deg, #a78bfa 0%, #6D28D9 100%)',
  'linear-gradient(145deg, #fb923c 0%, #DC2626 100%)',
  'linear-gradient(145deg, #38bdf8 0%, #0369A1 100%)',
];

function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!;
}

export function ProjectListPage(): JSX.Element {
  const navigate    = useNavStore((s) => s.navigate);
  const { showToast } = useToast();
  const recent      = useProjectStore((s) => s.recentProjects);
  const isLoading   = useProjectStore((s) => s.isLoading);
  const loadRecent  = useProjectStore((s) => s.loadRecent);
  const openProject = useProjectStore((s) => s.openProject);
  const [query, setQuery] = useState('');

  useEffect(() => { void loadRecent(); }, []);

  const filtered = query.trim()
    ? recent.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.clientName.toLowerCase().includes(query.toLowerCase())
      )
    : recent;

  async function handleOpen(project: RecentProject): Promise<void> {
    try {
      await openProject(project.filePath);
      navigate('project-overview', { projectId: project.projectId });
    } catch (err) {
      showToast('error', 'Could not open project', err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-display)', fontSize: 'var(--type-title-size)', fontWeight: 'var(--type-title-weight)', lineHeight: 'var(--type-title-height)', color: 'var(--color-text-primary)', margin: 0 }}>
            Projects
          </h1>
          <p style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0 0' }}>
            Open a recent project or create a new one.
          </p>
        </div>
        <Button variant="accent" startIcon={<AddRegular />} onClick={() => navigate('create-project')}>
          New project
        </Button>
      </header>

      {/* Search bar */}
      {!isLoading && recent.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none', display: 'inline-flex' }}>
            <SearchRegular fontSize={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or client…"
            className="input"
            style={{ paddingLeft: 34 }}
            aria-label="Search projects"
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <ProjectCardsSkeleton />
      ) : filtered.length === 0 && query ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
          No projects match "{query}"
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => navigate('create-project')} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {filtered.map((p) => (
            <ProjectCard key={p.projectId} project={p} onOpen={() => void handleOpen(p)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ProjectCard({ project, onOpen }: { project: RecentProject; onOpen: () => void }): JSX.Element {
  const gradient = gradientFor(project.name);
  const initials = project.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const formattedDate = new Date(project.lastOpenedAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display:        'flex',
        flexDirection:  'column',
        textAlign:      'left',
        background:     'var(--color-layer-1)',
        border:         '1px solid var(--color-stroke-default)',
        borderRadius:   'var(--radius-card)',
        overflow:       'hidden',
        cursor:         'pointer',
        padding:        0,
        fontFamily:     'var(--font-family)',
        transition:     'transform 0.18s var(--easing-decelerate), box-shadow 0.18s var(--easing-decelerate), border-color 0.18s ease',
        position:       'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform   = 'translateY(-4px)';
        el.style.boxShadow   = 'var(--shadow-card-hover)';
        el.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.45)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform   = '';
        el.style.boxShadow   = '';
        el.style.borderColor = 'var(--color-stroke-default)';
      }}
    >
      {/* Gradient header strip — taller, more expressive */}
      <div style={{
        height:          96,
        background:      gradient,
        display:         'flex',
        alignItems:      'flex-end',
        justifyContent:  'space-between',
        flexShrink:      0,
        padding:         'var(--space-3) var(--space-4)',
        position:        'relative',
        overflow:        'hidden',
      }}>
        {/* Subtle noise overlay for texture */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUJsZW5kIG1vZGU9Im92ZXJsYXkiIGluPSJTb3VyY2VHcmFwaGljIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==") repeat',
          pointerEvents: 'none',
          opacity:    0.4,
        }} />
        {/* Initials avatar */}
        <span style={{
          width:          48,
          height:         48,
          borderRadius:   '50%',
          background:     'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border:         '1px solid rgba(255,255,255,0.35)',
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       19,
          fontWeight:     700,
          color:          '#FFFFFF',
          fontFamily:     'var(--font-family-display)',
          letterSpacing:  '0.01em',
          flexShrink:     0,
        }}>
          {initials || <FolderOpenRegular fontSize={22} />}
        </span>
        {/* Date pill top-right */}
        <span style={{
          fontSize:     10,
          fontFamily:   'var(--font-mono)',
          color:        'rgba(255,255,255,0.75)',
          background:   'rgba(0,0,0,0.20)',
          borderRadius: 'var(--radius-pill)',
          padding:      '2px 8px',
          flexShrink:   0,
        }}>
          {formattedDate}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <div style={{
          fontSize:     'var(--type-body-strong-size)',
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {project.name}
        </div>
        {project.clientName && (
          <div style={{
            fontSize:     'var(--type-caption-size)',
            color:        'var(--color-text-secondary)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {project.clientName}
          </div>
        )}
      </div>

      {/* Footer: open hint */}
      <div style={{
        padding:    'var(--space-2) var(--space-4)',
        borderTop:  '1px solid var(--color-stroke-divider)',
        background: 'var(--color-fill-subtle)',
        display:    'flex',
        alignItems: 'center',
        gap:        'var(--space-1)',
        fontSize:   11,
        color:      'var(--color-text-tertiary)',
      }}>
        <FolderOpenRegular fontSize={12} />
        Open project
      </div>
    </button>
  );
}

function ProjectCardsSkeleton(): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
      {[...Array(4)].map((_, i) => (
        <FluentSkeleton key={i} height={178} borderRadius="var(--radius-card)" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
      <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>
        <FolderOpenRegular fontSize={48} />
      </span>
      <div>
        <div style={{ fontSize: 'var(--type-subtitle-size)', fontWeight: 'var(--type-subtitle-weight)', color: 'var(--color-text-primary)' }}>No projects yet</div>
        <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>Create a project to start capturing evidence.</div>
      </div>
      <Button variant="accent" startIcon={<AddRegular />} onClick={onCreate}>Create project</Button>
    </div>
  );
}
