interface AddEditJobModalProps {
  isOpen: boolean;
  isEditing: boolean;
  jobForm: {
    company: string;
    position: string;
    date_applied: string;
    wfh: string;
    notes: string;
    job_link: string;
  };
  setJobForm: (form: any) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export function AddEditJobModal({ isOpen, isEditing, jobForm, setJobForm, onClose, onSave }: AddEditJobModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>{isEditing ? 'Edit Job Record' : 'Add New Job Record'}</h3>
        <form onSubmit={onSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input type="text" placeholder="Company *" value={jobForm.company} onChange={(e) => setJobForm({...jobForm, company: e.target.value})} required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
          <input type="text" placeholder="Position *" value={jobForm.position} onChange={(e) => setJobForm({...jobForm, position: e.target.value})} required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
          <input type="text" placeholder="Date Applied" value={jobForm.date_applied} onChange={(e) => setJobForm({...jobForm, date_applied: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
          <input type="text" placeholder="WFH (Yes/No/Hybrid)" value={jobForm.wfh} onChange={(e) => setJobForm({...jobForm, wfh: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
          <input type="text" placeholder="Job Link" value={jobForm.job_link} onChange={(e) => setJobForm({...jobForm, job_link: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', gridColumn: 'span 2' }} />
          <textarea placeholder="Notes" value={jobForm.notes} onChange={(e) => setJobForm({...jobForm, notes: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', gridColumn: 'span 2', minHeight: '80px', resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', gridColumn: 'span 2', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{ background: '#cbd5e1', color: '#0f172a', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
            <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>{isEditing ? 'Update Job' : 'Save Job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}