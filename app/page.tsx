import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Finance Planner</h1>
      <p>Ứng dụng quản lý tài chính cá nhân - Tuần 8</p>
      <p>
        <Link href="/dashboard" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          Đến trang Dashboard &rarr;
        </Link>
      </p>
    </main>
  );
}
