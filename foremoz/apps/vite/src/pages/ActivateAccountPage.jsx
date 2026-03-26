import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson } from '../lib.js';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', success: false, alreadyActive: false });

  useEffect(() => {
    const token = String(searchParams.get('token') || '').trim();
    if (!token) {
      setState({ loading: false, error: 'Token aktivasi tidak ditemukan.', success: false, alreadyActive: false });
      return;
    }

    let cancelled = false;
    async function runActivation() {
      try {
        const result = await apiJson('/v1/tenant/auth/activate', {
          method: 'POST',
          body: JSON.stringify({ token })
        });
        if (cancelled) return;
        setState({
          loading: false,
          error: '',
          success: true,
          alreadyActive: Boolean(result.already_active)
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          loading: false,
          error: error.message,
          success: false,
          alreadyActive: false
        });
      }
    }

    runActivation();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <AuthLayout
      title="Aktivasi owner account"
      subtitle="Konfirmasi email owner sebelum mulai setup tenant."
      alternateHref="/signin"
      alternateText="Kembali ke sign in"
    >
      <section className="card form">
        {state.loading ? <p className="feedback">Memproses aktivasi akun...</p> : null}
        {!state.loading && state.success ? (
          <>
            <p className="feedback">
              {state.alreadyActive ? 'Akun ini sudah aktif.' : 'Akun berhasil diaktivasi.'}
            </p>
            <p className="feedback">Sekarang kamu bisa sign in dan membuat event/class.</p>
            <Link className="btn" to="/signin?activated=1">
              Lanjut ke sign in
            </Link>
          </>
        ) : null}
        {!state.loading && state.error ? (
          <>
            <p className="error">{state.error}</p>
            <Link className="btn" to="/signin">
              Ke sign in
            </Link>
          </>
        ) : null}
      </section>
    </AuthLayout>
  );
}
