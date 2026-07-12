import NavBar from '@/components/nav-bar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <NavBar />
      {children}
    </div>
  );
}
