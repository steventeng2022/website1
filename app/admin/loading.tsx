export default function AdminLoading() {
  return <main className="admin-loading" aria-busy="true" aria-label="正在載入管理中心">
    <div className="admin-loading__heading"><span className="admin-nav-spinner" aria-hidden="true" /><p role="status">正在開啟管理中心…</p></div>
    <div className="admin-loading__line" />
    <div className="admin-loading__cards" aria-hidden="true"><span /><span /><span /></div>
  </main>;
}
