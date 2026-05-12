import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import {
  ChevronLeftRegular,
  ArchiveRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { Button, Card } from '../components/ui';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useToast } from '../providers/ToastProvider';

/**
 * W10 — ProjectSettingsPage (PM-03 + PM-08).
 *
 * PM-03: rename project + change client name.
 * PM-08: archive project (preserves .evidex on disk, removes from active list).
 */

export function ProjectSettingsPage(): JSX.Element | null {
  const projectId     = useNavStore((s) => s.currentProjectId);
  const navigate      = useNavStore((s) => s.navigate);
  const goBack        = useNavStore((s) => s.goBack);
  const activeProject = useProjectStore((s) => s.activeProject);
  const { showToast } = useToast();

  const [name,       setName]       = useState(activeProject?.name ?? '');
  const [clientName, setClientName] = useState(activeProject?.clientName ?? '');
  const [saving,     setSaving]     = useState(false);
  const [archiving,  setArchiving]  = useState(false);

  if (!projectId || !activeProject) return null;

  async function handleSave(): Promise<void> {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await window.evidexAPI.project.update(projectId!, {
        name: name.trim(),
        clientName: clientName.trim(),
      });
      if (res.ok) {
        showToast('success', 'Project settings saved');
        goBack();
      } else {
        showToast('error', 'Save failed', res.error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(): Promise<void> {
    // Simple browser confirm — a proper modal (M-11) lands in Phase 4.
    if (!window.confirm('Archive this project? It will no longer appear in your active list. The .evidex file is preserved on disk.')) return;
    setArchiving(true);
    try {
      const res = await window.evidexAPI.project.update(projectId!, { status: 'archived' });
      if (res.ok) {
        showToast('success', 'Project archived');
        navigate('project-list');
      } else {
        showToast('error', 'Archive failed', res.error.message);
      }
    } finally {
      setArchiving(false);
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
      <header>
        <button
          type="button"
          className="btn-link"
          onClick={goBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginBottom: 'var(--space-2)',
            fontSize: 'var(--type-caption-size)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ChevronLeftRegular fontSize={14} />
          {activeProject.name}
        </button>
        <h1
          style={{
            fontFamily:  'var(--font-family-display)',
            fontSize:    'var(--type-title-size)',
            fontWeight:  'var(--type-title-weight)',
            lineHeight:  'var(--type-title-height)',
            color:       'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Project settings
        </h1>
      </header>

      {/* General settings card */}
      <Card variant="default">
        <h2
          style={{
            fontSize:   'var(--type-body-strong-size)',
            fontWeight: 'var(--type-body-strong-weight)',
            color:      'var(--color-text-primary)',
            margin:     '0 0 var(--space-4)',
          }}
        >
          General
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              htmlFor="proj-name"
              style={{
                display: 'block',
                fontSize: 'var(--type-caption-size)',
                color:    'var(--color-text-secondary)',
                marginBottom: 4,
              }}
            >
              Project name <span style={{ color: 'var(--color-text-danger)' }}>*</span>
            </label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-stroke-default)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-layer-1)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--type-body-size)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="proj-client"
              style={{
                display: 'block',
                fontSize: 'var(--type-caption-size)',
                color:    'var(--color-text-secondary)',
                marginBottom: 4,
              }}
            >
              Client name
            </label>
            <input
              id="proj-client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-stroke-default)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-layer-1)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--type-body-size)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            paddingTop: 'var(--space-4)',
            marginTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-stroke-divider)',
          }}
        >
          <Button
            variant="accent"
            startIcon={<SaveRegular />}
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>

      {/* Danger zone card */}
      <Card variant="default">
        <h2
          style={{
            fontSize:   'var(--type-body-strong-size)',
            fontWeight: 'var(--type-body-strong-weight)',
            color:      'var(--color-text-primary)',
            margin:     '0 0 var(--space-3)',
          }}
        >
          Danger zone
        </h2>
        <p
          style={{
            fontSize: 'var(--type-body-size)',
            color:    'var(--color-text-secondary)',
            margin:   '0 0 var(--space-4)',
          }}
        >
          Archiving marks this project as inactive. The <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>.evidex</code> file is preserved on disk — it can be re-opened at any time.
        </p>
        <Button
          variant="standard"
          startIcon={<ArchiveRegular />}
          onClick={() => void handleArchive()}
          disabled={archiving}
        >
          {archiving ? 'Archiving…' : 'Archive project'}
        </Button>
      </Card>
    </motion.div>
  );
}
