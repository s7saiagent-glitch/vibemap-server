export function MemberList({ members, renderAction }) {
  if (!members?.length) return null;
  return (
    <div>
      {members.map((m) => (
        <div
          key={m.id || m.user_id || m.membership_id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}
        >
          <div>
            <div>{m.name || m.guest_name || m.senderName}</div>
            {m.phone && <div className="muted" style={{ fontSize: 12 }}>{m.phone}</div>}
            {m.role && <span className="badge badge-paid" style={{ marginTop: 4 }}>{m.role === 'admin' ? 'مشرف' : 'عضو'}</span>}
          </div>
          {renderAction?.(m)}
        </div>
      ))}
    </div>
  );
}
