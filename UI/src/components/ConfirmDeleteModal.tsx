interface ConfirmDeleteModalProps {
  jobToDelete: any;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ jobToDelete, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!jobToDelete) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#0f172a' }}>Confirm Deletion</h3>
        <p style={{ color: '#334155', fontSize: '14px', marginBottom: '20px' }}>
          Are you sure you want to delete <strong>{jobToDelete.company}</strong> - {jobToDelete.position}?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: '#cbd5e1', color: '#0f172a', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
