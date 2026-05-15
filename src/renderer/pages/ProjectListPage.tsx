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

// Deterministic pastel gradient per project name
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
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
        transition:     'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-layer-2)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent-default)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-stroke-default)';
      }}
    >
      {/* Gradient header strip */}
      <div style={{
        height:          72,
        background:      gradient,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}>
        <span style={{
          width:          44,
          height:         44,
          borderRadius:   '50%',
          background:     'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       18,
          fontWeight:     700,
          color:          '#FFFFFF',
          fontFamily:     'var(--font-family-display)',
          letterSpacing:  '0.02em',
        }}>
          {initials || <FolderOpenRegular fontSize={22} />}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', flex: 1 }}>
        <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </div>
        {project.clientName && (
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.clientName}
          </div>
        )}
        <div style={{ marginTop: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {new Date(project.lastOpenedAt).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

function ProjectCardsSkeleton(): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
      {[...Array(4)].map((_, i) => (
        <FluentSkeleton key={i} height={148} borderRadius="var(--radius-card)" style={{ opacity: 1 - i * 0.15 }} />
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
